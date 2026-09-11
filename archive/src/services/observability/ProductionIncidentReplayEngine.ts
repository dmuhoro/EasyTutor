export interface IncidentFrame {
  timestamp: string;
  event: string;
  payload?: Record<string, unknown>;
}

export class ProductionIncidentReplayEngine {
  replay(frames: IncidentFrame[]): { deterministic: boolean; events: string[] } {
    const sorted = [...frames].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const events = sorted.map((frame) => frame.event);
    const deterministic = sorted.every((frame, index) => index === 0 || sorted[index - 1].timestamp <= frame.timestamp);
    return { deterministic, events };
  }
}
