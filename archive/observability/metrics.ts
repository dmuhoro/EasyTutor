import { create } from 'zustand';

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

interface MetricsStore {
  metrics: Metric[];
  recordMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  clearMetrics: () => void;
  getAverage: (name: string, tags?: Record<string, string>) => number;
}

export const useMetricsStore = create<MetricsStore>((set, get) => ({
  metrics: [],
  recordMetric: (name, value, tags) =>
    set((state) => ({
      metrics: [
        ...state.metrics,
        { name, value, tags, timestamp: new Date().toISOString() },
      ],
    })),
  clearMetrics: () => set({ metrics: [] }),
  getAverage: (name, tags) => {
    const relevant = get().metrics.filter((m) => {
      if (m.name !== name) return false;
      if (tags) {
        return Object.entries(tags).every(([k, v]) => m.tags?.[k] === v);
      }
      return true;
    });

    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, m) => acc + m.value, 0);
    return sum / relevant.length;
  },
}));

/**
 * Utility to generate a markdown performance report.
 */
export const generateReport = (): string => {
  const store = useMetricsStore.getState();
  const names = Array.from(new Set(store.metrics.map((m) => m.name)));

  let report = `# System Performance Report\n\n`;
  report += `Generated at: ${new Date().toISOString()}\n\n`;
  report += `| Metric | Average | Count |\n`;
  report += `| :--- | :--- | :--- |\n`;

  names.forEach((name) => {
    const avg = store.getAverage(name);
    const count = store.metrics.filter((m) => m.name === name).length;
    report += `| ${name} | ${avg.toFixed(2)} | ${count} |\n`;
  });

  return report;
};
