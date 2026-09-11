export class ProposalClosingAssistant {
  assist(proposal: {
    proposalId: string;
    stakeholderCount: number;
    urgency: 'low' | 'medium' | 'high';
    objections?: string[];
  }): {
    closed: boolean;
    confidence: number;
    nextBestAction: string;
  } {
    const objectionPenalty = (proposal.objections ?? []).length * 0.08;
    const urgencyBoost = proposal.urgency === 'high' ? 0.18 : proposal.urgency === 'medium' ? 0.08 : 0;
    const confidence = Math.max(0, Math.min(1, 0.55 + urgencyBoost - objectionPenalty - proposal.stakeholderCount * 0.02));

    return {
      closed: confidence >= 0.65,
      confidence: Number(confidence.toFixed(2)),
      nextBestAction: confidence >= 0.65 ? 'issue-proposal-and-book-close-call' : 'handle-objections-and-schedule-follow-up',
    };
  }
}
