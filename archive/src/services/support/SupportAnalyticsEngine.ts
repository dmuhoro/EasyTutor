import { SupportTicket } from './OperationalSupportDesk';

export class SupportAnalyticsEngine {
  summarize(tickets: SupportTicket[]): { total: number; criticalRate: number } {
    const total = tickets.length;
    const criticalCount = tickets.filter((item) => item.severity === 'critical').length;
    return { total, criticalRate: total === 0 ? 0 : criticalCount / total };
  }
}
