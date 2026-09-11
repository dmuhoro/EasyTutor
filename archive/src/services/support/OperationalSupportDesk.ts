export interface SupportTicket {
  ticketId: string;
  tenantId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  createdAt: string;
}

export class OperationalSupportDesk {
  createTicket(tenantId: string, issue: string, severity: SupportTicket['severity']): SupportTicket {
    return {
      ticketId: `ticket_${tenantId}_${Date.now()}`,
      tenantId,
      issue,
      severity,
      createdAt: new Date().toISOString(),
    };
  }
}
