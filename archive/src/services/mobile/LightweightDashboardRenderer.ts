export class LightweightDashboardRenderer {
  render(metrics: Record<string, number>): { view: string; cards: Array<{ key: string; value: number }> } {
    const cards = Object.entries(metrics).map(([key, value]) => ({ key, value }));
    return { view: 'compact-mobile', cards };
  }
}
