import { AgentProposal } from '../agenticContracts';

export class ConsensusEngine {
  validate(proposals: readonly AgentProposal[]): {
    accepted: boolean;
    decision: 'approve' | 'revise' | 'reject';
    confidence: number;
  } {
    if (proposals.length === 0) {
      return { accepted: false, decision: 'reject', confidence: 0 };
    }

    const score = proposals.reduce(
      (accumulator, proposal) => {
        accumulator[proposal.decision] += proposal.confidence;
        return accumulator;
      },
      { approve: 0, revise: 0, reject: 0 },
    );

    const ordered = Object.entries(score).sort((left, right) => right[1] - left[1]);
    const [decision, confidence] = ordered[0] as [typeof proposals[number]['decision'], number];
    return {
      accepted: decision === 'approve',
      decision,
      confidence,
    };
  }
}
