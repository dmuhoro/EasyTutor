export class SMEUsagePatternAnalyzer {
  analyze(events: Array<{ hour: number; action: string }>): { peakHour: number; dominantAction: string } {
    const hourCounts = new Map<number, number>();
    const actionCounts = new Map<string, number>();
    for (const event of events) {
      hourCounts.set(event.hour, (hourCounts.get(event.hour) ?? 0) + 1);
      actionCounts.set(event.action, (actionCounts.get(event.action) ?? 0) + 1);
    }
    const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 9;
    const dominantAction = [...actionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'monitoring';
    return { peakHour, dominantAction };
  }
}
