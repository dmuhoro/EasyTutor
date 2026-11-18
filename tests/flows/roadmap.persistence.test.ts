import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { useRoadmapStore, CustomRoadmap } from '../../store/roadmapStore';
import { stableHashId } from '../../lib/stableId';
import { warmLearningPort } from '../utils/warmLearningPort';

describe('Roadmap Persistence & Task Progress Sync Flow', () => {
  warmLearningPort();

  beforeEach(() => {
    mockSupabase.reset();
    useRoadmapStore.getState().setUserId(TEST_USER_ID);
    useRoadmapStore.getState().setLearningMode('self_directed');
    useRoadmapStore.setState({
      roadmaps: [],
      checkedTasks: {},
      pendingTaskSyncs: [],
    });
  });

  it('persists free-form roadmap and syncs checked tasks to learning_goals', async () => {
    const store = useRoadmapStore.getState();
    const topic = 'Quantum Computing Basics';
    const id = stableHashId(topic);

    const roadmap: CustomRoadmap = {
      id,
      topic,
      title: 'Quantum Computing Basics',
      days: [
        { day: 1, title: 'Day 1: Qubits', tasks: ['Understand superposition', 'Explore Bloch sphere'] },
        { day: 2, title: 'Day 2: Gates', tasks: ['Hadamard gate', 'CNOT gate'] },
      ],
      learningMode: 'self_directed',
      createdAt: new Date().toISOString(),
    };

    // 1. Add and save roadmap
    store.addRoadmap(roadmap);
    await store.saveRoadmap(roadmap, 'self_directed');

    const goals = mockSupabase.db.learning_goals;
    expect(goals).toHaveLength(1);
    expect(goals[0].topic).toBe(topic);
    expect(goals[0].user_id).toBe(TEST_USER_ID);

    // 2. Toggle task
    store.toggleTask(id, 1, 'Understand superposition');
    expect(useRoadmapStore.getState().checkedTasks[id]?.[1]).toEqual(['Understand superposition']);

    // 3. Save task progress to cloud
    await store.saveTaskProgressToCloud(id);
    expect(goals[0].data.checked_tasks).toEqual({
      '1': ['Understand superposition'],
    });

    // 4. Reset in-memory store state to simulate cold restart
    useRoadmapStore.setState({
      roadmaps: [],
      checkedTasks: {},
    });

    // 5. Rehydrate from cloud
    await useRoadmapStore.getState().fetchSavedRoadmaps();
    const state = useRoadmapStore.getState();

    expect(state.roadmaps.some((r) => r.topic === topic)).toBe(true);
    expect(state.checkedTasks[id]?.[1]).toEqual(['Understand superposition']);
  });

  it('persists curriculum roadmap and rehydrates checked tasks from cached_roadmaps', async () => {
    const store = useRoadmapStore.getState();
    store.setLearningMode('high_school');
    const topic = 'Linear Equations';
    const subjectId = 'hs-math';

    // Seed cached_roadmaps directly
    mockSupabase.db.cached_roadmaps.push({
      id: '55555555-5555-4555-8555-555555555555',
      user_id: TEST_USER_ID,
      subject_id: subjectId,
      topic_id: '22222222-2222-4222-8222-222222222222',
      portal_type: 'high_school',
      roadmap_json: {
        topic,
        title: 'Linear Equations Mastery',
        days: [
          { day: 1, title: 'Slope and Intercept', tasks: ['Calculate slope', 'Find y-intercept'] },
        ],
      },
      checked_tasks: {
        '1': ['Calculate slope'],
      },
      created_at: new Date().toISOString(),
    });

    // 1. Fetch saved roadmaps
    await store.fetchSavedRoadmaps();
    const state = useRoadmapStore.getState();

    const loaded = state.roadmaps.find((r) => r.topic === topic);
    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe('55555555-5555-4555-8555-555555555555');
    expect(state.checkedTasks['55555555-5555-4555-8555-555555555555']?.[1]).toEqual(['Calculate slope']);

    // 2. Toggle another task and save to cloud
    state.toggleTask('55555555-5555-4555-8555-555555555555', 1, 'Find y-intercept');
    await state.saveTaskProgressToCloud('55555555-5555-4555-8555-555555555555');

    const updatedRow = mockSupabase.db.cached_roadmaps.find(
      (r) => r.id === '55555555-5555-4555-8555-555555555555'
    );
    expect(updatedRow?.checked_tasks?.[1]).toContain('Calculate slope');
    expect(updatedRow?.checked_tasks?.[1]).toContain('Find y-intercept');
  });

  it('fetchCachedRoadmap rehydrates checked tasks for curriculum topic', async () => {
    useRoadmapStore.getState().setLearningMode('high_school');
    mockSupabase.db.cached_roadmaps.push({
      id: '77777777-7777-4777-8777-777777777777',
      user_id: TEST_USER_ID,
      subject_id: 'hs-math',
      topic_id: '22222222-2222-4222-8222-222222222222',
      portal_type: 'high_school',
      roadmap_json: {
        topic: 'Linear Equations',
        title: 'Linear Equations Mastery',
        days: [{ day: 1, title: 'Day 1', tasks: ['Task A'] }],
      },
      checked_tasks: {
        '1': ['Task A'],
      },
      created_at: new Date().toISOString(),
    });

    const store = useRoadmapStore.getState();
    const res = await store.fetchCachedRoadmap('hs-math', '22222222-2222-4222-8222-222222222222');
    expect(res).not.toBeNull();
    expect(useRoadmapStore.getState().checkedTasks['77777777-7777-4777-8777-777777777777']?.[1]).toEqual(['Task A']);
  });
});
