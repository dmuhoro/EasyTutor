import { describe, it, expect, beforeEach } from 'vitest';
import { useMathJourneyStore } from '../../store/mathJourneyStore';
import { useAuthStore } from '../../store/authStore';

const LEARNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('math journey store', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    useAuthStore.getState().setSession({
      access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 9999999999,
      expires_in: 9999999999, token_type: 'bearer',
      user: { id: LEARNER_ID, email: 'learner@example.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' },
    });
  });
  it('records a scored diagnostic answer and computes a recommendation', () => {
    const store = useMathJourneyStore.getState();
    store.activateLearner(LEARNER_ID);
    expect(store.beginDiagnostic('equations')).toBe(true);
    expect(useMathJourneyStore.getState().submitAnswer('5')).toBe(true);
    const s = useMathJourneyStore.getState();
    expect(s.learnerId).toBe(LEARNER_ID);
    expect(s.recommendation).toBeTruthy();
    expect(s.masteryConfidence).toBeGreaterThan(0);
  });
  it('records practice evidence and preserves history', () => {
    const st = useMathJourneyStore.getState();
    st.activateLearner(LEARNER_ID);
    st.beginDiagnostic('fractions');
    st.submitAnswer('3/4');
    st.beginDiagnostic('equations');
    st.submitAnswer('incorrect', 1);
    expect(useMathJourneyStore.getState().evidence.length).toBe(2);
    expect(useMathJourneyStore.getState().masteryConfidence).toBe(0.25);
  });
});
