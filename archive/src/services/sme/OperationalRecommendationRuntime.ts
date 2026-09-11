export class OperationalRecommendationRuntime {
  recommend(ctx: { auditScore: number; industry: string }): {
    recommendations: string[];
    urgency: 'low' | 'medium' | 'high';
  } {
    const recommendations = [
      'Standardize deployment checklist for every new tenant',
      'Attach attribution tags to every outbound campaign asset',
    ];

    if (ctx.industry === 'dental_clinic') {
      recommendations.push('Automate appointment reminder and rebooking workflows');
    }

    return {
      recommendations,
      urgency: ctx.auditScore < 0.6 ? 'high' : ctx.auditScore < 0.8 ? 'medium' : 'low',
    };
  }
}
