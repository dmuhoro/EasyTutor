import { TenantContext, UserRole } from './tenantContracts';

/**
 * ROLE ACCESS CONTROLLER (RBAC)
 * 
 * Fine-grained access control for platform operations based on tenant roles.
 */
export class RoleAccessController {
  private static ROLE_HIERARCHY: Record<UserRole, number> = {
    system: 100,
    owner: 90,
    admin: 80,
    moderator: 60,
    tutor: 40,
    student: 20,
  };

  static canPerform(context: TenantContext, requiredRole: UserRole): boolean {
    const userWeight = this.ROLE_HIERARCHY[context.role] || 0;
    const requiredWeight = this.ROLE_HIERARCHY[requiredRole] || 0;
    
    return userWeight >= requiredWeight;
  }

  static assertRole(context: TenantContext, requiredRole: UserRole): void {
    if (!this.canPerform(context, requiredRole)) {
      throw new Error(`[RBAC ERROR] User ${context.user_id} with role ${context.role} cannot perform ${requiredRole} level operation`);
    }
  }

  /**
   * Platform level permission check
   */
  static hasPermission(context: TenantContext, operation: string): boolean {
    // In production, this would be a map of operation -> requiredRole
    const operationPermissions: Record<string, UserRole> = {
      'tenant:update': 'admin',
      'tenant:delete': 'owner',
      'inference:execute': 'student',
      'audit:view': 'moderator',
    };

    const requiredRole = operationPermissions[operation];
    if (!requiredRole) return true; // Operations not in map are public to any role in tenant

    return this.canPerform(context, requiredRole);
  }
}
