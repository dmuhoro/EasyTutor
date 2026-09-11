import { Client, ClientStatus } from './businessContracts';
import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * CLIENT ENTITY MANAGER
 * 
 * Manages the lifecycle and persistence of clients within the OperatorOS.
 */
export class ClientEntityManager {
  static async createClient(context: TenantContext, clientData: Partial<Client>): Promise<Client> {
    const client: Client = {
      id: `client_${Date.now()}`,
      tenant_id: context.tenant_id,
      org_id: context.org_id,
      name: clientData.name || 'Unknown Client',
      email: clientData.email || '',
      status: 'lead',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: clientData.metadata || {},
    };

    // Persist to governed DB
    await Database.governedWrite('business_clients', client, { 
      portalType: context.portal_type,
      userId: context.user_id 
    });

    return client;
  }

  static async updateStatus(context: TenantContext, clientId: string, status: ClientStatus): Promise<void> {
    await Database.governedWrite('business_clients', { id: clientId, status, updated_at: new Date().toISOString() }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type,
      userId: context.user_id
    });
  }

  static async getClient(context: TenantContext, clientId: string): Promise<Client | null> {
    const query = Database.governedQuery({
      table: 'business_clients',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any).eq('id', clientId).single();
    return error ? null : data;
  }
}
