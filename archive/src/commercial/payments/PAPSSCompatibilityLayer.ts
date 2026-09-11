/**
 * PAPSS COMPATIBILITY LAYER
 *
 * Pan-African Payment System Settlement (PAPSS) integration:
 * - Message format conversion
 * - Regulatory compliance
 * - Settlement coordination
 * - Audit trail
 */

import { PAPSSMessage, CurrencyCode } from './paymentContracts';

export interface PAPSSCompliantTransaction {
  papss_reference: string;
  transaction_id: string;
  originating_country: string;
  destination_country: string;
  amount: number;
  currency: CurrencyCode;
  message_type: 'payment' | 'settlement' | 'inquiry' | 'response';
  status: 'submitted' | 'in_clearing' | 'settled' | 'rejected';
  timestamp: string;
}

export class PAPSSCompatibilityLayer {
  private papssMessages: Map<string, PAPSSCompliantTransaction> = new Map();
  private countryCodes: Map<string, string> = new Map();
  private regulatoryCompliance: Map<string, { kyc_verified: boolean; aml_cleared: boolean }> =
    new Map();

  constructor() {
    this.initializeCountryCodes();
  }

  private initializeCountryCodes(): void {
    const codes: Record<string, string> = {
      KE: 'KEN',
      UG: 'UGA',
      TZ: 'TZA',
      CD: 'COD',
      NG: 'NGA',
      ZA: 'ZAF',
      GH: 'GHA',
    };

    for (const [code, iso] of Object.entries(codes)) {
      this.countryCodes.set(code, iso);
    }
  }

  async convertToPAPSSMessage(
    transaction_id: string,
    fromCountry: string,
    toCountry: string,
    amount: number,
    currency: CurrencyCode
  ): Promise<PAPSSCompliantTransaction> {
    // Validate PAPSS compliance
    if (!this.isCompliantRoute(fromCountry, toCountry)) {
      throw new Error(`Route ${fromCountry}->${toCountry} not PAPSS compliant`);
    }

    const papssRef = this.generatePAPSSReference(fromCountry, toCountry);

    const message: PAPSSCompliantTransaction = {
      papss_reference: papssRef,
      transaction_id,
      originating_country: this.countryCodes.get(fromCountry) || fromCountry,
      destination_country: this.countryCodes.get(toCountry) || toCountry,
      amount,
      currency,
      message_type: 'payment',
      status: 'submitted',
      timestamp: new Date().toISOString(),
    };

    this.papssMessages.set(papssRef, message);
    return message;
  }

  async submitToPAPSS(message: PAPSSCompliantTransaction): Promise<{ accepted: boolean; reference: string }> {
    // Validate compliance before submission
    if (!this.validatePAPSSCompliance(message)) {
      throw new Error('Transaction does not meet PAPSS compliance requirements');
    }

    // Update status
    message.status = 'in_clearing';
    this.papssMessages.set(message.papss_reference, message);

    return {
      accepted: true,
      reference: message.papss_reference,
    };
  }

  async updateComplianceStatus(
    country: string,
    kyc_verified: boolean,
    aml_cleared: boolean
  ): Promise<void> {
    this.regulatoryCompliance.set(country, { kyc_verified, aml_cleared });
  }

  private isCompliantRoute(fromCountry: string, toCountry: string): boolean {
    // Check if both countries are PAPSS members
    const papssMembers = ['KE', 'UG', 'TZ', 'CD', 'NG', 'ZA', 'GH'];
    return papssMembers.includes(fromCountry) && papssMembers.includes(toCountry);
  }

  private validatePAPSSCompliance(message: PAPSSCompliantTransaction): boolean {
    // Check KYC and AML for both countries
    const fromCompliance = this.regulatoryCompliance.get(message.originating_country);
    const toCompliance = this.regulatoryCompliance.get(message.destination_country);

    return !!(
      fromCompliance?.kyc_verified &&
      fromCompliance?.aml_cleared &&
      toCompliance?.kyc_verified &&
      toCompliance?.aml_cleared
    );
  }

  private generatePAPSSReference(fromCountry: string, toCountry: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PAPSS-${fromCountry}-${toCountry}-${timestamp}-${random}`;
  }

  getPAPSSMessage(papss_reference: string): PAPSSCompliantTransaction | undefined {
    return this.papssMessages.get(papss_reference);
  }

  getMessageStatus(papss_reference: string): string | undefined {
    return this.papssMessages.get(papss_reference)?.status;
  }

  recordSettlement(papss_reference: string): void {
    const message = this.papssMessages.get(papss_reference);
    if (message) {
      message.status = 'settled';
    }
  }
}
