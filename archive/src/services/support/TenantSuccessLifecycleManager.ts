export class TenantSuccessLifecycleManager {
  getStage(daysSinceOnboarding: number): 'onboarding' | 'adoption' | 'expansion' {
    if (daysSinceOnboarding < 30) return 'onboarding';
    if (daysSinceOnboarding < 120) return 'adoption';
    return 'expansion';
  }
}
