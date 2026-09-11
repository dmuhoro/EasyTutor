import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import { LearningIdentity } from './learningIdentityEngine';
import { getSubjectMastery } from './mastery';
import { buildPortalScopedQuery } from '../src/infrastructure/database/governedQueries';
import { executeGovernedWrite } from '../src/infrastructure/database/governedWrites';
import { portalFromMode } from '../store/roadmapStore';
import { useRoadmapStore } from '../store/roadmapStore';

export type KnowledgeCategory = 'domain' | 'subject' | 'topic' | 'concept';

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  difficulty_level: number; // 1-100
  category: KnowledgeCategory;
  prerequisites: string[]; // array of node IDs
  estimated_mastery_time_mins: number;
}

export interface KnowledgePath {
  id: string;
  user_id: string;
  path_goal: string;
  nodes: string[]; // Ordered list of node IDs to traverse
  current_node_id: string | null;
  status: 'active' | 'completed' | 'paused';
}

const GRAPH_NODES_CACHE = 'knowledge_nodes_cache_v1';
const GRAPH_PATHS_CACHE = 'knowledge_paths_cache_v1';

/** 
 * Retrieves all knowledge nodes. 
 * In a production environment this would be paginated or lazy-loaded,
 * but for the graph substrate we assume we can load the required nodes.
 */
export async function getAllKnowledgeNodes(): Promise<Map<string, KnowledgeNode>> {
  const nodeMap = new Map<string, KnowledgeNode>();
  
  try {
    const cached = await AsyncStorage.getItem(GRAPH_NODES_CACHE);
    if (cached) {
      const nodes = JSON.parse(cached) as KnowledgeNode[];
      nodes.forEach(n => nodeMap.set(n.id, n));
      if (nodes.length > 0) return nodeMap;
    }
  } catch {}

  if (!supabase) return nodeMap;

  try {
    const { data, error } = await buildPortalScopedQuery(supabase, {
      table: 'knowledge_nodes',
      columns: '*',
      portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school')
    });
    if (error) {
      logSupabaseError('knowledge_nodes', 'select', error);
      return nodeMap;
    }
    
    if (data) {
      const nodes = data as unknown as KnowledgeNode[];
      nodes.forEach(n => nodeMap.set(n.id, n));
      await AsyncStorage.setItem(GRAPH_NODES_CACHE, JSON.stringify(nodes));
    }
  } catch (err) {
    logSupabaseError('knowledge_nodes', 'select', err);
  }

  return nodeMap;
}

/** Utility to topological sort nodes given dependencies */
function topologicalSort(nodes: KnowledgeNode[], nodeMap: Map<string, KnowledgeNode>): string[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string) {
    if (temp.has(nodeId)) return; // prevent cycles
    if (visited.has(nodeId)) return;

    temp.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (node) {
      for (const req of node.prerequisites) {
        visit(req);
      }
    }
    temp.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      visit(node.id);
    }
  }

  return order;
}

/** 
 * Generates a personalized learning path through the knowledge graph.
 * 
 * Logic:
 * 1. Filter graph based on learner goals/interests.
 * 2. Identify target concepts.
 * 3. Traverse prerequisites backwards to find the starting frontier.
 * 4. Remove already mastered topics.
 * 5. Topologically sort the remaining frontier into an ordered path.
 */
export async function generateLearningPath(
  identity: LearningIdentity
): Promise<KnowledgePath> {
  const nodeMap = await getAllKnowledgeNodes();
  
  // 1. Fetch current mastery
  const masteryRecords = await getSubjectMastery(identity.user_id, '');
  const masteredTopicIds = new Set(
    masteryRecords.filter(r => r.mastery_percent >= 80).map(r => r.topic)
  ); // Assuming node.title or id matches mastery topic name for simplicity, though real graph would map IDs exactly.

  // 2. Identify target nodes from graph based on identity goals/interests
  // In a real system, we'd use semantic search or NLP to map interests to node titles/categories.
  // Here we simulate by searching node titles/descriptions for keywords.
  const keywords = [...identity.goals, ...identity.interests].map(k => k.toLowerCase());
  
  let targetNodes = Array.from(nodeMap.values()).filter(node => 
    keywords.some(k => node.title.toLowerCase().includes(k) || node.description.toLowerCase().includes(k))
  );

  // If no targets found, pick foundational nodes based on difficulty
  if (targetNodes.length === 0) {
    targetNodes = Array.from(nodeMap.values())
      .filter(n => n.difficulty_level <= 30)
      .slice(0, 5); // Fallback to easy foundations
  }

  // 3. Gather all required prerequisites for targets
  const requiredNodeIds = new Set<string>();
  function gatherReqs(nodeId: string) {
    if (requiredNodeIds.has(nodeId)) return;
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    requiredNodeIds.add(nodeId);
    for (const req of node.prerequisites) {
      gatherReqs(req);
    }
  }

  for (const t of targetNodes) {
    gatherReqs(t.id);
  }

  // 4. Remove already mastered nodes (simulate match by title for now)
  const unmasteredNodeIds = Array.from(requiredNodeIds).filter(id => {
    const node = nodeMap.get(id);
    if (!node) return false;
    return !masteredTopicIds.has(node.title);
  });

  const unmasteredNodes = unmasteredNodeIds.map(id => nodeMap.get(id)!).filter(Boolean);

  // 5. Topologically sort to create the learning sequence
  const pathSequence = topologicalSort(unmasteredNodes, nodeMap);

  const newPath: KnowledgePath = {
    id: `temp-${Date.now()}`, // Will be replaced by DB UUID
    user_id: identity.user_id,
    path_goal: identity.goals[0] || 'Foundational Mastery',
    nodes: pathSequence,
    current_node_id: pathSequence[0] || null,
    status: 'active',
  };

  // 6. Persist Path
  return await persistKnowledgePath(newPath);
}

/** Persists knowledge path locally and remotely */
export async function persistKnowledgePath(path: KnowledgePath): Promise<KnowledgePath> {
  const cacheKey = `${GRAPH_PATHS_CACHE}:${path.user_id}`;
  try {
    const existingStr = await AsyncStorage.getItem(cacheKey);
    const existing = existingStr ? JSON.parse(existingStr) as KnowledgePath[] : [];
    
    // Inactivate older paths
    const updated: KnowledgePath[] = existing.map(p => ({ ...p, status: 'paused' }));
    
    // Determine ID (either keep temp or wait for DB)
    let finalPath = { ...path };

    if (supabase) {
      try {
        const data = await executeGovernedWrite(supabase, {
          table: 'knowledge_paths',
          portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
          userId: path.user_id,
          action: 'insert',
          payload: {
            path_goal: path.path_goal,
            nodes: path.nodes,
            current_node_id: path.current_node_id,
            status: path.status,
          }
        });
        
        if (data) {
          finalPath = data as KnowledgePath;
        }
      } catch (error) {
        // failed
      }
    }

    updated.push(finalPath);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
    return finalPath;
  } catch (err) {
    return path; // best effort fallback
  }
}

/** Get active path for a user */
export async function getActiveKnowledgePath(userId: string): Promise<KnowledgePath | null> {
  try {
    const existingStr = await AsyncStorage.getItem(`${GRAPH_PATHS_CACHE}:${userId}`);
    if (existingStr) {
      const existing = JSON.parse(existingStr) as KnowledgePath[];
      const active = existing.find(p => p.status === 'active');
      if (active) return active;
    }
  } catch {}

  if (!supabase) return null;
  try {
    const { data, error } = await buildPortalScopedQuery(supabase, {
      table: 'knowledge_paths',
      columns: '*',
      portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
      userId
    })
      .eq('status', 'active')
      .single();
      
    if (data) return data as unknown as KnowledgePath;
  } catch {}

  return null;
}
