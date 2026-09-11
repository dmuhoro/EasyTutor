import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as curriculumEngine from '../lib/adaptiveCurriculumEngine';
import * as mastery from '../lib/mastery';
import * as knowledgeGraph from '../lib/knowledgeGraphEngine';
import * as identityEngine from '../lib/learningIdentityEngine';

vi.mock('../lib/mastery', () => ({
  getSubjectMastery: vi.fn(),
}));

vi.mock('../lib/knowledgeGraphEngine', () => ({
  getAllKnowledgeNodes: vi.fn(),
}));

vi.mock('../lib/learningIdentityEngine', () => ({
  getIdentity: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: null, // mock offline
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(),
    getItem: vi.fn(),
  }
}));

const mockNodes: knowledgeGraph.KnowledgeNode[] = [
  { id: '1', title: 'Basic Algebra', description: 'Intro to algebra', difficulty_level: 10, category: 'topic', prerequisites: [], estimated_mastery_time_mins: 30 },
  { id: '2', title: 'Advanced Algebra', description: 'Harder algebra', difficulty_level: 50, category: 'topic', prerequisites: ['1'], estimated_mastery_time_mins: 45 },
  { id: '3', title: 'Calculus', description: 'Intro to calc', difficulty_level: 80, category: 'topic', prerequisites: ['2'], estimated_mastery_time_mins: 60 },
  { id: '4', title: 'Physics', description: 'Physics basics', difficulty_level: 40, category: 'topic', prerequisites: ['1'], estimated_mastery_time_mins: 30 },
];

describe('Adaptive Curriculum Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const nodeMap = new Map();
    mockNodes.forEach(n => nodeMap.set(n.id, n));
    (knowledgeGraph.getAllKnowledgeNodes as any).mockResolvedValue(nodeMap);
  });

  it('determineCurrentKnowledgePosition should return mastered nodes', async () => {
    (mastery.getSubjectMastery as any).mockResolvedValue([
      { topic: 'Basic Algebra', mastery_percent: 90 },
      { topic: 'Advanced Algebra', mastery_percent: 40 }
    ]);

    const pos = await curriculumEngine.determineCurrentKnowledgePosition('user1');
    expect(pos).toHaveLength(1);
    expect(pos[0].title).toBe('Basic Algebra');
  });

  it('determineTargetDestination should use identity goals to find next target', async () => {
    (identityEngine.getIdentity as any).mockResolvedValue({
      user_id: 'user1',
      goals: ['Calculus'],
      interests: []
    });
    
    (mastery.getSubjectMastery as any).mockResolvedValue([
      { topic: 'Basic Algebra', mastery_percent: 90 }
    ]);

    const target = await curriculumEngine.determineTargetDestination('user1');
    expect(target.title).toBe('Calculus');
  });

  it('computeOptimalLearningPath should return topological path of unmastered prerequisites', async () => {
    const current = [mockNodes[0]]; // Basic Algebra
    const target = mockNodes[2]; // Calculus (needs Advanced Algebra)

    const path = await curriculumEngine.computeOptimalLearningPath(current, target);
    expect(path).toHaveLength(2); // Advanced Algebra -> Calculus
    expect(path[0].title).toBe('Advanced Algebra');
    expect(path[1].title).toBe('Calculus');
  });

  it('detectMissingPrerequisites should find gaps', async () => {
    (mastery.getSubjectMastery as any).mockResolvedValue([]);
    const path = [mockNodes[1]]; // Advanced Algebra (needs Basic Algebra, which we don't have)
    
    const gaps = await curriculumEngine.detectMissingPrerequisites(path, 'user1');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].title).toBe('Basic Algebra');
  });

  it('buildAdaptiveLearningPath should build a full deterministic path', async () => {
    (mastery.getSubjectMastery as any).mockResolvedValue([
      { topic: 'Basic Algebra', mastery_percent: 65 } // not mastered (>=80), but strong (>=60)
    ]);
    (identityEngine.getIdentity as any).mockResolvedValue({
      user_id: 'user1',
      goals: ['Physics'],
      interests: []
    });

    const adaptivePath = await curriculumEngine.buildAdaptiveLearningPath('user1');
    
    expect(adaptivePath.destination.title).toBe('Physics');
    expect(adaptivePath.recommended_path).toHaveLength(2); // Basic Algebra -> Physics
    expect(adaptivePath.prerequisite_gaps).toHaveLength(0); // Actually Basic Algebra is missing from current_position! So it will be in recommended_path.
    expect(adaptivePath.acceleration_path).toHaveLength(1); // Physics (Basic Algebra is skipped because >60%)
    expect(adaptivePath.explanation).toContain('To reach mastery in Physics, we recommend a path of 2 key concepts');
  });
});
