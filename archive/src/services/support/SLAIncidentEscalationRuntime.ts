import { SupportTicket } from './OperationalSupportDesk';

export class SLAIncidentEscalationRuntime {
  escalate(ticket: SupportTicket, minutesOpen: number): { escalated: boolean; level: 'none' | 'manager' | 'executive' } {
    if (ticket.severity === 'critical' && minutesOpen >= 15) return { escalated: true, level: 'executive' };
    if ((ticket.severity === 'high' && minutesOpen >= 30) || (ticket.severity === 'critical' && minutesOpen >= 5)) {
      return { escalated: true, level: 'manager' };
    }
    return { escalated: false, level: 'none' };
  }
}
