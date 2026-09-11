import { OperationalIncident } from '../maturityContracts';
import { Telemetry } from '../../observability/telemetry';

/**
 * OPERATIONAL INCIDENT COORDINATOR
 * 
 * Manages the lifecycle of operational incidents, bridging automated detection 
 * with human escalation pathways.
 */
export class OperationalIncidentCoordinator {
  private static incidents: Map<string, OperationalIncident> = new Map();

  static reportIncident(incident: Omit<OperationalIncident, 'incident_id' | 'status'>): string {
    const id = `inc_${Date.now()}`;
    const fullIncident: OperationalIncident = { ...incident, incident_id: id, status: 'open' };
    
    this.incidents.set(id, fullIncident);
    
    console.error(`[INCIDENT] ${incident.severity.toUpperCase()} incident reported on ${incident.component}: ${incident.description}`);

    Telemetry.emit({
      event: 'OPERATIONAL_INCIDENT_REPORTED',
      source: 'platform',
      operationType: 'governance',
      payload: fullIncident as any
    });

    return id;
  }

  static getIncident(id: string): OperationalIncident | undefined {
    return this.incidents.get(id);
  }

  static resolveIncident(id: string): void {
    const incident = this.incidents.get(id);
    if (incident) {
      incident.status = 'resolved';
      console.log(`[INCIDENT] Incident ${id} resolved.`);
    }
  }
}
