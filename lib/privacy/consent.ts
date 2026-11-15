/**
 * Consent Management (Constitution Article II - Data Protection)
 *
 * Manages user consent for data collection and processing. Consent is
 * explicit, informed, and freely given. Users can withdraw consent at any
 * time.
 */

export interface ConsentRecord {
  consented: boolean;
  consentedAt: string | null;
  consentVersion: string;
  dataProcessing: boolean;
  analytics: boolean;
  marketing: boolean;
  ageVerified: boolean;
  ageVerifiedAt: string | null;
}

const CONSENT_STORAGE_KEY = 'easytutor-consent';
const CONSENT_VERSION = '1.0.0';

/**
 * Get the current consent status.
 */
export const getConsent = async (): Promise<ConsentRecord> => {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return {
        consented: false,
        consentedAt: null,
        consentVersion: CONSENT_VERSION,
        dataProcessing: false,
        analytics: false,
        marketing: false,
        ageVerified: false,
        ageVerifiedAt: null,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      consented: false,
      consentedAt: null,
      consentVersion: CONSENT_VERSION,
      dataProcessing: false,
      analytics: false,
      marketing: false,
      ageVerified: false,
      ageVerifiedAt: null,
    };
  }
};

/**
 * Save consent status.
 */
export const saveConsent = async (consent: ConsentRecord): Promise<void> => {
  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
};

/**
 * Grant consent for data processing.
 */
export const grantConsent = async (options: {
  dataProcessing?: boolean;
  analytics?: boolean;
  marketing?: boolean;
}): Promise<void> => {
  const current = await getConsent();
  await saveConsent({
    ...current,
    consented: true,
    consentedAt: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
    dataProcessing: options.dataProcessing ?? true,
    analytics: options.analytics ?? false,
    marketing: options.marketing ?? false,
  });
};

/**
 * Withdraw consent (user opts out of data processing).
 */
export const withdrawConsent = async (): Promise<void> => {
  const current = await getConsent();
  await saveConsent({
    ...current,
    consented: false,
    consentedAt: null,
    dataProcessing: false,
    analytics: false,
    marketing: false,
  });
};

/**
 * Check if consent has been given.
 */
export const isConsented = async (): Promise<boolean> => {
  const consent = await getConsent();
  return consent.consented;
};

/**
 * Record age verification.
 */
export const recordAgeVerification = async (age: number): Promise<void> => {
  const current = await getConsent();
  await saveConsent({
    ...current,
    ageVerified: true,
    ageVerifiedAt: new Date().toISOString(),
  });
};

import AsyncStorage from '@react-native-async-storage/async-storage';