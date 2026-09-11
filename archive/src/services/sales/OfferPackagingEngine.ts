export class OfferPackagingEngine {
  package(offerSpec: {
    tenantId: string;
    segment: 'starter' | 'growth' | 'enterprise';
    teamSize?: number;
    priorities?: string[];
  }): {
    offerId: string;
    tier: 'starter' | 'growth' | 'enterprise';
    includedModules: string[];
    recommendedPriceUSD: number;
  } {
    const includedModules = ['deployment', 'customer_success', 'analytics'];

    if (offerSpec.segment !== 'starter') {
      includedModules.push('marketing_attribution');
    }

    if (offerSpec.segment === 'enterprise') {
      includedModules.push('trust_dashboard', 'workflow_blueprints');
    }

    const teamSize = offerSpec.teamSize ?? 5;
    const recommendedPriceUSD = offerSpec.segment === 'starter'
      ? 149 + teamSize * 8
      : offerSpec.segment === 'growth'
        ? 399 + teamSize * 12
        : 899 + teamSize * 20;

    return {
      offerId: `offer-${offerSpec.tenantId}-${offerSpec.segment}`,
      tier: offerSpec.segment,
      includedModules,
      recommendedPriceUSD,
    };
  }
}
