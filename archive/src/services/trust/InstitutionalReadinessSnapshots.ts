export class InstitutionalReadinessSnapshots {
  create(tenantId: string): {
    snapshotId: string;
    tenantId: string;
    readinessScore: number;
  } {
    return {
      snapshotId: `snapshot-${tenantId}`,
      tenantId,
      readinessScore: 0.88,
    };
  }
}
