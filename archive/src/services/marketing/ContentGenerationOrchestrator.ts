export class ContentGenerationOrchestrator {
  async generate(spec: {
    tenantId: string;
    objective: string;
    channels: string[];
  }): Promise<{
    id: string;
    angle: string;
    channels: string[];
    callToAction: string;
  }> {
    return {
      id: `content-${spec.tenantId}-${spec.channels.join('-')}`,
      angle: `Operational ROI for ${spec.objective}`,
      channels: [...spec.channels],
      callToAction: 'Book a deployment readiness session',
    };
  }
}
