interface SalesConversationEntry {
  tenantId: string;
  message: string;
  stage: string;
  timestamp: string;
}

export class SalesConversationMemory {
  private static readonly conversations = new Map<string, SalesConversationEntry[]>();

  record(conv: { tenantId: string; message: string; stage: string }): { stored: boolean; totalEntries: number } {
    const entries = SalesConversationMemory.conversations.get(conv.tenantId) ?? [];
    entries.push({
      ...conv,
      timestamp: new Date().toISOString(),
    });
    SalesConversationMemory.conversations.set(conv.tenantId, entries);

    return {
      stored: true,
      totalEntries: entries.length,
    };
  }

  getTimeline(tenantId: string): SalesConversationEntry[] {
    return [...(SalesConversationMemory.conversations.get(tenantId) ?? [])];
  }
}
