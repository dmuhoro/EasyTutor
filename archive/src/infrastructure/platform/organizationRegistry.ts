import { Organization } from './tenantContracts';

/**
 * ORGANIZATION REGISTRY
 * 
 * Manages institutional and organizational entities that own tenants.
 */
export class OrganizationRegistry {
  private static instance: OrganizationRegistry;
  private orgs: Map<string, Organization> = new Map();

  static getInstance(): OrganizationRegistry {
    if (!OrganizationRegistry.instance) {
      OrganizationRegistry.instance = new OrganizationRegistry();
    }
    return OrganizationRegistry.instance;
  }

  async getOrganization(orgId: string): Promise<Organization | null> {
    return this.orgs.get(orgId) || null;
  }

  async registerOrganization(org: Organization): Promise<void> {
    this.orgs.set(org.org_id, org);
  }

  async listOrganizations(): Promise<Organization[]> {
    return Array.from(this.orgs.values());
  }
}

export const organizationRegistry = OrganizationRegistry.getInstance();
