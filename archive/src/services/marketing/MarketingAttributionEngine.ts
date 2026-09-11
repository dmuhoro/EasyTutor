export class MarketingAttributionEngine {
  attribute(events: Array<{ source: string; conversion: boolean; tenantId: string }>): {
    attributions: Array<{ source: string; leads: number; conversions: number; tenants: string[] }>;
    influencedRevenueUSD: number;
  } {
    const buckets = new Map<string, { leads: number; conversions: number; tenants: Set<string> }>();

    for (const event of events) {
      const entry = buckets.get(event.source) ?? { leads: 0, conversions: 0, tenants: new Set<string>() };
      entry.leads += 1;
      entry.conversions += event.conversion ? 1 : 0;
      entry.tenants.add(event.tenantId);
      buckets.set(event.source, entry);
    }

    const attributions = Array.from(buckets.entries()).map(([source, value]) => ({
      source,
      leads: value.leads,
      conversions: value.conversions,
      tenants: Array.from(value.tenants),
    }));

    return {
      attributions,
      influencedRevenueUSD: attributions.reduce((sum, item) => sum + item.conversions * 450, 0),
    };
  }
}
