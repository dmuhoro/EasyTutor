import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { KnowledgeNode, getAllKnowledgeNodes } from './knowledgeGraphEngine';
import { getSubjectMastery } from './mastery';
import { getIdentity } from './learningIdentityEngine';
import { executeGovernedWrite } from '../src/infrastructure/database/governedWrites';
import { portalFromMode } from '../store/roadmapStore';
import { useRoadmapStore } from '../store/roadmapStore';

export interface AdaptiveLearningPath {
  learnerId: string;
  current_position: KnowledgeNode[];
  destination: KnowledgeNode;
  recommended_path: KnowledgeNode[];
  recovery_path?: KnowledgeNode[];
  acceleration_path?: KnowledgeNode[];
  skippable_nodes?: KnowledgeNode[];
  prerequisite_gaps: KnowledgeNode[];
  estimated_completion: {
    days: number;
    confidence: number;
  };
  explanation: string;
}

// Re-export KnowledgeNode from knowledgeGraphEngine to match the spec's expected signature shape,
// though the spec had a slightly different signature (level vs difficulty_level).
// We map it below.
export type { KnowledgeNode } from './knowledgeGraphEngine';

const ADAPTIVE_PATH_CACHE = 'ADAPTIVE_PATH_CACHE_';

export async function determineCurrentKnowledgePosition(learnerId: string): Promise<KnowledgeNode[]> {
  const masteryRecords = await getSubjectMastery(learnerId, '');
  const masteredTitles = new Set(masteryRecords.filter(r => r.mastery_percent >= 80).map(r => r.topic));
  
  const nodeMap = await getAllKnowledgeNodes();
  const currentNodes: KnowledgeNode[] = [];
  for (const node of nodeMap.values()) {
    if (masteredTitles.has(node.title)) {
      currentNodes.push(node);
    }
  }
  return currentNodes;
}

export async function determineTargetDestination(learnerId: string): Promise<KnowledgeNode> {
  const identity = await getIdentity(learnerId);
  const nodeMap = await getAllKnowledgeNodes();
  
  const keywords = [...(identity?.goals || []), ...(identity?.interests || [])].map(k => k.toLowerCase());
  const currentNodes = await determineCurrentKnowledgePosition(learnerId);
  const masteredIds = new Set(currentNodes.map(n => n.id));

  let targetNodes = Array.from(nodeMap.values()).filter(node => 
    !masteredIds.has(node.id) &&
    keywords.some(k => node.title.toLowerCase().includes(k) || node.description.toLowerCase().includes(k))
  );

  if (targetNodes.length === 0) {
    targetNodes = Array.from(nodeMap.values()).filter(n => !masteredIds.has(n.id));
  }

  // Sort by difficulty, pick the most appropriate next step
  targetNodes.sort((a, b) => a.difficulty_level - b.difficulty_level);
  
  if (targetNodes.length > 0) {
    return targetNodes[0];
  }
  
  // Fallback to the first node if completely stuck
  return Array.from(nodeMap.values())[0];
}

function topologicalSortSubgraph(nodes: KnowledgeNode[], nodeMap: Map<string, KnowledgeNode>): KnowledgeNode[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: string[] = [];

  const nodeSet = new Set(nodes.map(n => n.id));

  function visit(nodeId: string) {
    if (temp.has(nodeId)) return;
    if (visited.has(nodeId)) return;

    temp.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (node && nodeSet.has(nodeId)) {
      for (const req of node.prerequisites) {
        if (nodeSet.has(req)) {
          visit(req);
        }
      }
    }
    temp.delete(nodeId);
    visited.add(nodeId);
    if (nodeSet.has(nodeId)) {
      order.push(nodeId);
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      visit(node.id);
    }
  }

  return order.map(id => nodeMap.get(id)!).filter(Boolean);
}

export async function computeOptimalLearningPath(current: KnowledgeNode[], target: KnowledgeNode): Promise<KnowledgeNode[]> {
  const nodeMap = await getAllKnowledgeNodes();
  const currentIds = new Set(current.map(n => n.id));
  
  const requiredIds = new Set<string>();
  function gatherReqs(nodeId: string) {
    if (requiredIds.has(nodeId)) return;
    requiredIds.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (node) {
      for (const req of node.prerequisites) {
        gatherReqs(req);
      }
    }
  }
  gatherReqs(target.id);

  const unmasteredIds = Array.from(requiredIds).filter(id => !currentIds.has(id));
  const unmasteredNodes = unmasteredIds.map(id => nodeMap.get(id)!).filter(Boolean);

  return topologicalSortSubgraph(unmasteredNodes, nodeMap);
}

export async function detectMissingPrerequisites(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]> {
  const current = await determineCurrentKnowledgePosition(learnerId);
  const currentIds = new Set(current.map(n => n.id));
  const pathIds = new Set(path.map(n => n.id));
  const nodeMap = await getAllKnowledgeNodes();

  const gaps = new Set<string>();
  for (const node of path) {
    for (const req of node.prerequisites) {
      if (!currentIds.has(req) && !pathIds.has(req)) {
        gaps.add(req);
      }
    }
  }

  return Array.from(gaps).map(id => nodeMap.get(id)!).filter(Boolean);
}

export async function buildRecoveryPath(path: KnowledgeNode[], gaps: KnowledgeNode[]): Promise<KnowledgeNode[]> {
  const nodeMap = await getAllKnowledgeNodes();
  return topologicalSortSubgraph([...gaps, ...path], nodeMap);
}

export async function buildAccelerationPath(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]> {
  const masteryRecords = await getSubjectMastery(learnerId, '');
  const strongTitles = new Set(masteryRecords.filter(r => r.mastery_percent >= 60).map(r => r.topic));
  
  // Acceleration skips intermediate nodes where user has shown some strength (>60%)
  // or nodes with very low difficulty (<20) if they are strong overall.
  return path.filter(node => !strongTitles.has(node.title) && node.difficulty_level >= 20);
}

export async function estimateTimeToGoal(path: KnowledgeNode[], learnerId: string): Promise<{ days: number; confidence: number }> {
  const totalMins = path.reduce((sum, node) => sum + (node.estimated_mastery_time_mins || 30), 0);
  const days = Math.ceil(totalMins / 60); // Assuming 1 hour of study per day
  
  return {
    days: days > 0 ? days : 1,
    confidence: 0.85
  };
}

export async function recommendSkippableNodes(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]> {
  const masteryRecords = await getSubjectMastery(learnerId, '');
  const masteredTitles = new Set(masteryRecords.filter(r => r.mastery_percent >= 80).map(r => r.topic));
  
  return path.filter(node => masteredTitles.has(node.title));
}

export function explainReasoning(adaptivePath: AdaptiveLearningPath): string {
  const target = adaptivePath.destination.title;
  const pathLength = adaptivePath.recommended_path.length;
  const gapCount = adaptivePath.prerequisite_gaps.length;
  
  let explanation = `To reach mastery in ${target}, we recommend a path of ${pathLength} key concepts. `;
  
  if (gapCount > 0) {
    explanation += `We noticed ${gapCount} foundational gaps, which have been added to your recovery path to ensure solid understanding. `;
  }
  
  if (adaptivePath.skippable_nodes && adaptivePath.skippable_nodes.length > 0) {
    explanation += `Because you've shown strong performance previously, you can safely skip ${adaptivePath.skippable_nodes.length} introductory topics. `;
  }
  
  explanation += `Based on your pacing, you should reach this goal in about ${adaptivePath.estimated_completion.days} days.`;
  
  return explanation;
}

export async function buildAdaptiveLearningPath(learnerId: string): Promise<AdaptiveLearningPath> {
  const current_position = await determineCurrentKnowledgePosition(learnerId);
  const destination = await determineTargetDestination(learnerId);
  
  const recommended_path = await computeOptimalLearningPath(current_position, destination);
  const prerequisite_gaps = await detectMissingPrerequisites(recommended_path, learnerId);
  const recovery_path = prerequisite_gaps.length > 0 ? await buildRecoveryPath(recommended_path, prerequisite_gaps) : undefined;
  const acceleration_path = await buildAccelerationPath(recommended_path, learnerId);
  const skippable_nodes = await recommendSkippableNodes(recommended_path, learnerId);
  const estimated_completion = await estimateTimeToGoal(recommended_path, learnerId);
  
  const adaptivePath: AdaptiveLearningPath = {
    learnerId,
    current_position,
    destination,
    recommended_path,
    recovery_path,
    acceleration_path,
    skippable_nodes,
    prerequisite_gaps,
    estimated_completion,
    explanation: ''
  };
  
  adaptivePath.explanation = explainReasoning(adaptivePath);
  
  // Persistence
  try {
    await AsyncStorage.setItem(`${ADAPTIVE_PATH_CACHE}${learnerId}`, JSON.stringify(adaptivePath));
      if (supabase) {
        await executeGovernedWrite(supabase, {
          table: 'adaptive_learning_paths',
          portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
          userId: learnerId,
          action: 'insert',
          payload: {
            current_position: adaptivePath.current_position,
            destination: adaptivePath.destination,
            recommended_path: adaptivePath.recommended_path,
            recovery_path: adaptivePath.recovery_path,
            acceleration_path: adaptivePath.acceleration_path,
            skippable_nodes: adaptivePath.skippable_nodes,
            prerequisite_gaps: adaptivePath.prerequisite_gaps,
            estimated_completion: new Date(Date.now() + adaptivePath.estimated_completion.days * 24 * 60 * 60 * 1000).toISOString(),
            confidence: adaptivePath.estimated_completion.confidence,
            explanation: adaptivePath.explanation
          }
        });
      }
  } catch (err) {
    console.warn('Failed to persist adaptive path', err);
  }
  
  return adaptivePath;
}


