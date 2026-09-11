export class IndustryWorkflowBlueprints {
  get(industry: string): {
    industry: string;
    workflows: string[];
    kpis: string[];
  } {
    if (industry === 'dental_clinic') {
      return {
        industry,
        workflows: ['lead-intake', 'appointment-reminders', 'post-treatment-followup'],
        kpis: ['chair-utilization', 'rebooking-rate', 'collections-cycle'],
      };
    }

    return {
      industry,
      workflows: ['lead-capture', 'proposal-followup', 'service-delivery'],
      kpis: ['response-time', 'close-rate', 'retention-rate'],
    };
  }
}
