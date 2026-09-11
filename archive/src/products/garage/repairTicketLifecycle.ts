import { Database } from '../../infrastructure/database';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * REPAIR TICKET LIFECYCLE (GarageOS)
 * 
 * Manages the core operational entity of the garage vertical: the repair ticket.
 */
export class RepairTicketLifecycle {
  static async openTicket(context: TenantContext, vehicleVin: string, reportedIssue: string): Promise<string> {
    const ticketId = `tick_${Date.now()}`;
    
    await Database.governedWrite('garage_repair_tickets', {
      id: ticketId,
      tenant_id: context.tenant_id,
      vehicle_vin: vehicleVin,
      reported_issue: reportedIssue,
      status: 'open',
      created_at: new Date().toISOString()
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });

    return ticketId;
  }

  static async assignTechnician(context: TenantContext, ticketId: string, technicianId: string): Promise<void> {
    await Database.governedWrite('garage_repair_tickets', {
      id: ticketId,
      technician_id: technicianId,
      status: 'assigned'
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type
    });
  }
}
