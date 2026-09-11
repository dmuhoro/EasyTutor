export type TenantSnapshot = {
  tenantId: string;
  version: string;
  modules: string[];
  exportedAt: string;
};

export type ApiRequest = {
  tenantId: string;
  route: string;
  actorRole: 'owner' | 'operator' | 'partner' | 'developer';
};

export type LocalizationPreference = {
  language: 'en' | 'sw';
  currency: 'KES' | 'UGX' | 'TZS';
  countryCode: 'KE' | 'UG' | 'TZ';
};
