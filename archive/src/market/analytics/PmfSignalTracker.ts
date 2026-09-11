import { Database } from '../../infrastructure/database';
import { MarketFeedback } from '../marketContracts';

/**
 * PMF SIGNAL TRACKER
 * 
 * Aggregates qualitative feedback and quantitative metrics to track Product-Market Fit.
 */
export class PmfSignalTracker {
  private static feedbackSequence = 0;

  static async recordFeedback(feedback: Omit<MarketFeedback, 'id' | 'timestamp'>): Promise<void> {
    PmfSignalTracker.feedbackSequence += 1;
    await Database.governedWrite('market_feedback', {
      ...feedback,
      id: `fb_${Date.now()}_${PmfSignalTracker.feedbackSequence}`,
      timestamp: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: 'high_school'
    });
  }

  static async getPmfScore(productId: string): Promise<number> {
    const query = Database.governedQuery({
      table: 'market_feedback',
      columns: 'sentiment',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('category', 'pmf_signal');
    if (!data || data.length === 0) return 0;

    const positiveCount = data.filter((f: any) => f.sentiment === 'positive').length;
    return (positiveCount / data.length) * 100;
  }
}
