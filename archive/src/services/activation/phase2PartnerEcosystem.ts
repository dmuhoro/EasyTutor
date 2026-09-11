import { ApiRequest } from './contracts';

export class PublicApiGateway {
  authorize(request: ApiRequest): { allowed: boolean; reason?: string } {
    const blockedRoutes = ['internal/governance/write'];
    if (blockedRoutes.includes(request.route)) {
      return { allowed: false, reason: 'Route not publicly exposed.' };
    }
    if (request.actorRole === 'developer' && request.route.startsWith('admin/')) {
      return { allowed: false, reason: 'Role cannot access admin route.' };
    }
    return { allowed: true };
  }
}

export class PartnerIntegrationFramework {
  register(partnerId: string, scopes: string[]): { partnerId: string; approvedScopes: string[] } {
    const approvedScopes = scopes.filter((scope) => !scope.includes('unsafe'));
    return { partnerId, approvedScopes };
  }
}

export class ExternalAutomationConnector {
  connect(system: string, handshakeOk: boolean): { connected: boolean; system: string } {
    return { connected: handshakeOk, system };
  }
}

export class WebhookSubscriptionEngine {
  subscribe(event: string, callbackUrl: string): { subscribed: boolean; event: string } {
    const subscribed = callbackUrl.startsWith('https://');
    return { subscribed, event };
  }
}

export class ThirdPartyExtensionRegistry {
  private readonly allowedKinds = new Set(['analytics', 'workflow', 'notifications']);

  register(extension: { id: string; kind: string; version: string }): { accepted: boolean; extensionId: string } {
    return { accepted: this.allowedKinds.has(extension.kind), extensionId: extension.id };
  }
}
