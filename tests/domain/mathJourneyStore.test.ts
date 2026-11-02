import { describe, it, expect, beforeEach } from 'vitest';
import { useMathJourneyStore } from '../../store/mathJourneyStore';

describe('math journey store', () => {
  beforeEach(() => useMathJourneyStore.getState().reset());
  it('records diagnostic and computes recommendation', () => {
    useMathJourneyStore.getState().recordDiagnostic('u1','equations',[{skillId:'equations',correct:false,independent:false}]);
    const s = useMathJourneyStore.getState();
    expect(s.learnerId).toBe('u1');
    expect(s.recommendation).toBeTruthy();
    expect(s.masteryConfidence).toBeLessThan(0.5);
  });
  it('records practice evidence and preserves history', () => {
    const st = useMathJourneyStore.getState();
    st.recordDiagnostic('u1','fractions',[{skillId:'fractions',correct:true,independent:true}]);
    st.recordPractice({dimension:'application',weight:0.8,independent:true,hints:0});
    st.recordPractice({dimension:'transfer',weight:0.8,independent:true,hints:0});
    expect(useMathJourneyStore.getState().evidence.length).toBe(2);
    expect(useMathJourneyStore.getState().masteryConfidence).toBeGreaterThan(0.3);
  });
});
