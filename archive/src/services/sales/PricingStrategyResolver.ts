export class PricingStrategyResolver {
  resolve(spec: {
    segment: 'starter' | 'growth' | 'enterprise';
    markets?: string[];
    annualCommit?: boolean;
    teamSize?: number;
  }): {
    priceUSD: number;
    discountApplied: number;
    rationale: string;
  } {
    const base = spec.segment === 'starter' ? 149 : spec.segment === 'growth' ? 449 : 999;
    const teamModifier = Math.max(0, (spec.teamSize ?? 5) - 5) * (spec.segment === 'enterprise' ? 18 : 9);
    const annualDiscount = spec.annualCommit ? 0.1 : 0;
    const marketAdjustment = (spec.markets ?? []).includes('africa_sme') ? -25 : 0;
    const grossPrice = base + teamModifier + marketAdjustment;
    const priceUSD = Number((grossPrice * (1 - annualDiscount)).toFixed(2));

    return {
      priceUSD,
      discountApplied: annualDiscount,
      rationale: `Segment ${spec.segment} with ${spec.teamSize ?? 5} seats and localized SME adjustment`,
    };
  }
}
