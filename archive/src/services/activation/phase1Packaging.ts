import { TenantSnapshot } from './contracts';

export class InfrastructurePackageManager {
  createPackage(input: { tenantId: string; modules: string[]; version: string }): { packageId: string; items: number } {
    const packageId = `pkg_${input.tenantId}_${input.version.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    return { packageId, items: input.modules.length };
  }
}

export class VerticalDeploymentBundleGenerator {
  generate(vertical: string, capabilities: string[]): { bundleId: string; vertical: string; capabilities: string[] } {
    return {
      bundleId: `bundle_${vertical.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      vertical,
      capabilities: [...new Set(capabilities)],
    };
  }
}

export class CapabilityPresetRegistry {
  private readonly presets = new Map<string, string[]>([
    ['sme-core', ['tasks', 'cashflow', 'alerts']],
    ['institution-core', ['users', 'billing', 'analytics']],
    ['garage-ops', ['tickets', 'parts', 'mobile-money']],
  ]);

  resolve(presetId: string): { presetId: string; capabilities: string[] } {
    return { presetId, capabilities: this.presets.get(presetId) ?? [] };
  }
}

export class PortableRuntimeConfigurationEngine {
  export(config: Record<string, string | number | boolean>): { portable: boolean; checksum: string } {
    const raw = JSON.stringify(Object.keys(config).sort().reduce<Record<string, string | number | boolean>>((acc, key) => {
      acc[key] = config[key];
      return acc;
    }, {}));
    const checksum = `cfg_${raw.length}_${raw.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)}`;
    return { portable: true, checksum };
  }
}

export class TenantEnvironmentSnapshotManager {
  snapshot(tenantId: string, version: string, modules: string[]): TenantSnapshot {
    return { tenantId, version, modules: [...modules], exportedAt: new Date().toISOString() };
  }

  import(snapshot: TenantSnapshot): { imported: boolean; moduleCount: number } {
    return { imported: snapshot.modules.length > 0, moduleCount: snapshot.modules.length };
  }
}
