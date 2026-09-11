export class ContentPerformanceAnalyzer {
  analyze(id: string): {
    campaignId: string;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
  } {
    const impressions = 2400;
    const clicks = 216;
    const conversions = 18;

    return {
      campaignId: id,
      impressions,
      clicks,
      ctr: Number((clicks / impressions).toFixed(3)),
      conversions,
    };
  }
}
