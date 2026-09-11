/**
 * AIRTEL MONEY CONNECTOR
 *
 * Handles Airtel Money integration across East Africa:
 * - Uganda, Tanzania, Kenya, DRC support
 * - Airtel Money API integration
 * - Local number normalization
 * - Provider-specific quirks
 */

import { MobileMoneyTransaction, CurrencyCode } from './paymentContracts';

export interface AirtelPaymentRequest {
  phone_number: string;
  amount: number;
  currency: CurrencyCode;
  country_code: string; // 'UG' | 'TZ' | 'KE' | 'CD'
  reference: string;
}

export interface AirtelPaymentResponse {
  status: 'success' | 'failed' | 'pending';
  transaction_id: string;
  reference: string;
  timestamp: string;
}

export class AirtelMoneyConnector {
  private clientId: string;
  private clientSecret: string;
  private businessName: string;
  private countryEndpoints: Record<string, string> = {
    UG: 'https://api.airtel.africa/merchant/v1/payments/',
    TZ: 'https://api.airtel.africa/merchant/v1/payments/',
    KE: 'https://api.airtel.africa/merchant/v1/payments/',
    CD: 'https://api.airtel.africa/merchant/v1/payments/',
  };

  constructor(clientId: string, clientSecret: string, businessName: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.businessName = businessName;
  }

  async initiatePayment(request: AirtelPaymentRequest): Promise<AirtelPaymentResponse> {
    const normalizedPhone = this.normalizePhoneNumber(request.phone_number, request.country_code);

    if (!normalizedPhone) {
      throw new Error(`Invalid phone number for country ${request.country_code}`);
    }

    // Simulate Airtel API call
    const transactionId = `AIRTEL-${request.country_code}-${Date.now()}`;

    return {
      status: 'success',
      transaction_id: transactionId,
      reference: request.reference,
      timestamp: new Date().toISOString(),
    };
  }

  async queryTransaction(transaction_id: string, country_code: string): Promise<AirtelPaymentResponse> {
    // Simulate transaction query
    return {
      status: Math.random() > 0.2 ? 'success' : 'pending',
      transaction_id,
      reference: `REF-${transaction_id}`,
      timestamp: new Date().toISOString(),
    };
  }

  private normalizePhoneNumber(phoneNumber: string, countryCode: string): string | null {
    // Remove common formatting
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Country-specific normalization
    const patterns: Record<string, { pattern: RegExp; replace: string }> = {
      UG: { pattern: /^(256|0)/, replace: '256' },
      TZ: { pattern: /^(255|0)/, replace: '255' },
      KE: { pattern: /^(254|0)/, replace: '254' },
      CD: { pattern: /^(243|0)/, replace: '243' },
    };

    const config = patterns[countryCode];
    if (!config) return null;

    cleaned = cleaned.replace(config.pattern, config.replace);

    // Validate length (should be country code + 9 digits typically)
    if (cleaned.length < 12 || cleaned.length > 13) return null;

    return cleaned;
  }

  async handleIncomingPayment(webhookPayload: Record<string, unknown>): Promise<MobileMoneyTransaction> {
    const status = (webhookPayload.status as string) || 'completed';

    return {
      mobile_transaction_id: `AIRTEL-IN-${Date.now()}`,
      wallet_id: '',
      amount: (webhookPayload.amount as number) || 0,
      direction: 'inbound',
      reference_number: (webhookPayload.reference as string) || 'N/A',
      timestamp: new Date().toISOString(),
      status: status === 'SUCCESS' ? 'completed' : 'failed',
    };
  }

  getCountryCurrency(countryCode: string): CurrencyCode {
    const currencyMap: Record<string, CurrencyCode> = {
      UG: 'UGX',
      TZ: 'TZS',
      KE: 'KES',
      CD: 'USD', // DRC uses USD primarily for Airtel
    };

    return currencyMap[countryCode] as CurrencyCode;
  }

  generateAccessToken(): Promise<string> {
    // In production, would call Airtel OAuth endpoint
    return Promise.resolve(`Bearer mock_airtel_token_${Date.now()}`);
  }
}
