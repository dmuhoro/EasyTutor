import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { Database } from '../../src/infrastructure/database';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';

describe('Governed Feedback Write Flow (Constitution Article III)', () => {
  beforeEach(() => {
    mockSupabase.reset();
    setActivePortalContext({
      learningMode: 'high_school',
      userId: TEST_USER_ID,
    });
  });

  it('routes ai_feedback through the governed layer and stamps portal_type', async () => {
    await Database.governedWrite('ai_feedback', {
      content_type: 'quiz',
      rating: 'negative',
      feedback_text: 'Confusing explanation',
      topic: 'Quadratic Equations',
    }, {
      portalType: 'high_school',
    });

    const row = mockSupabase.db.ai_feedback[0];
    expect(row).toBeDefined();
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.portal_type).toBe('high_school');
    expect(row.content_type).toBe('quiz');
    expect(row.rating).toBe('negative');
  });

  it('routes user_feedback through the governed layer and stamps portal_type', async () => {
    await Database.governedWrite('user_feedback', {
      rating: 'good',
      comment: 'Great app',
      source: 'quiz_completion',
    }, {
      portalType: 'university',
    });

    const row = mockSupabase.db.user_feedback[0];
    expect(row).toBeDefined();
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.portal_type).toBe('university');
    expect(row.rating).toBe('good');
  });

  it('isolates feedback by portal_type (no cross-portal bleed)', async () => {
    await Database.governedWrite('ai_feedback', {
      content_type: 'roadmap',
      rating: 'positive',
      topic: 'Biology',
    }, { portalType: 'high_school' });

    await Database.governedWrite('ai_feedback', {
      content_type: 'roadmap',
      rating: 'positive',
      topic: 'Algorithms',
    }, { portalType: 'university' });

    const rows = mockSupabase.db.ai_feedback;
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.portal_type === 'high_school')).toHaveLength(1);
    expect(rows.filter((r) => r.portal_type === 'university')).toHaveLength(1);
  });
});