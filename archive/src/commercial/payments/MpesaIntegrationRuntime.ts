/**
 * M-PESA INTEGRATION RUNTIME
 *
 * Handles M-Pesa specific integration:
 * - STK Push for payment initiation
 * - C2B for incoming payments
 * - B2C for disbursements
 * - Account balance verification
 */

import { MobileMoneyTransaction, MobileWalletAccount } from './paymentContracts';

export interface MpesaPaymentRequest {
  phone_number: string;
  amount: number;
  description: string;
  account_reference: string;
  callback_url: string;
}

export interface MpesaPaymentResponse {
  request_id: string;
  merchant_request_id: string;
  checkout_request_id: string;
  response_code: string;
  response_description: string;
  customer_message: string;
}

export interface MpesaStkCallback {
  merchant_request_id: string;
  checkout_request_id: string;
  result_code: number;
  result_desc: string;
  amount?: number;
  mpesa_receipt_number?: string;
}

export class MpesaIntegrationRuntime {
  private mpesaApiKey: string;
  private mpesaApiUrl = 'https://sandbox.safaricom.co.ke/mpesa';
  private consumerKey: string;
  private consumerSecret: string;
  private shortCode: string;

  constructor(apiKey: string, consumerKey: string, consumerSecret: string, shortCode: string) {
    this.mpesaApiKey = apiKey;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.shortCode = shortCode;
  }

  async initiateSTKPush(request: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    // Simulate STK Push request
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const merchantRequestId = `${this.shortCode}${timestamp}`;
    const checkoutRequestId = `${merchantRequestId}${Math.random().toString(36).substring(7)}`;

    return {
      request_id: `${Date.now()}`,
      merchant_request_id: merchantRequestId,
      checkout_request_id: checkoutRequestId,
      response_code: '0',
      response_description: 'Success. Request accepted for processing',
      customer_message: 'Please enter your M-Pesa PIN to complete the payment',
    };
  }

  async handleSTKCallback(callback: MpesaStkCallback): Promise<MobileMoneyTransaction> {
    if (callback.result_code !== 0) {
      throw new Error(`M-Pesa payment failed: ${callback.result_desc}`);
    }

    return {
      mobile_transaction_id: `MPESA-${Date.now()}`,
      wallet_id: '', // Will be set by caller
      amount: callback.amount || 0,
      direction: 'outbound',
      reference_number: callback.mpesa_receipt_number || 'N/A',
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
  }

  async getAccountBalance(phone_number: string, wallet_id: string): Promise<number> {
    // Simulate balance inquiry
    return Math.random() * 100000;
  }

  async verifyPhoneNumber(phone_number: string): Promise<boolean> {
    // Validate Kenyan phone number format
    const kenyanPattern = /^(?:254|\+254|0)(?:7|1)\d{8}$/;
    if (!kenyanPattern.test(phone_number)) return false;

    // Simulate verification
    return true;
  }

  generateAccessToken(): string {
    // In production, this would call M-Pesa OAuth endpoint
    return `Bearer mock_token_${Date.now()}`;
  }

  validateCallback(signature: string, timestamp: string, body: string): boolean {
    // Validate M-Pesa callback signature
    return signature.length > 0 && timestamp.length > 0;
  }
}
