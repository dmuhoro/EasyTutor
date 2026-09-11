export class OperationalTrustAuditTrail {
  private readonly entries: Array<{ event: string; actor: string; timestamp: string }> = [];

  record(event: string, actor: string): { recorded: boolean; size: number } {
    this.entries.push({ event, actor, timestamp: new Date().toISOString() });
    return { recorded: true, size: this.entries.length };
  }

  list(): Array<{ event: string; actor: string; timestamp: string }> {
    return [...this.entries];
  }
}
