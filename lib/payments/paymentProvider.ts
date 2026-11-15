/**
 * Payment Design Hooks (Phase 4.5)
 *
 * Payment provider interface and types for future payment integration.
 * NO actual payment provider is integrated. All payment processing is
 * placeholder-only. Do not connect to Stripe, PayPal, or any other payment
 * provider without explicit user consent and proper compliance review.
 *
 * This file defines the shape of future payment integration:
 * - PaymentIntent: a payment request
 * * PaymentResult: the result of a payment attempt
 * * SubscriptionPlan: a subscription plan definition
 * * PaymentProvider: abstract interface for payment providers
 *
 * All methods are stubs that throw NotImplementedError.
 */

export interface PaymentIntent {
  id: string;
  amount: number; // in cents
  currency: string; // ISO-4217 currency code (KES, NGN, GHS, UGX, TZS, ETB, ZAR, USD, etc.)
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  createdAt: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  error?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  interval: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
}

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, description: string): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentResult>;
  cancelPayment(paymentIntentId: string): Promise<PaymentResult>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;
  isAvailable(): Promise<boolean>;
}

/**
 * No-op payment provider implementation. All methods throw NotImplementedError
 * to prevent accidental use before a real payment provider is integrated.
 */
export class NoOpPaymentProvider implements PaymentProvider {
  async createPaymentIntent(_amount: number, _currency: string, _description: string): Promise<PaymentIntent> {
    throw new Error('Payment provider not implemented. Payment integration is not available.');
  }

  async confirmPayment(_paymentIntentId: string, _paymentMethodId: string): Promise<PaymentResult> {
    throw new Error('Payment provider not implemented. Payment integration is not available.');
  }

  async cancelPayment(_paymentIntentId: string): Promise<PaymentResult> {
    throw new Error('Payment provider not implemented. Payment integration is not available.');
  }

  async getPaymentIntent(_paymentIntentId: string): Promise<PaymentIntent | null> {
    throw new Error('Payment provider not implemented. Payment integration is not available.');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

/**
 * Singleton payment provider instance.
 */
let paymentProvider: PaymentProvider | null = null;

export const getPaymentProvider = (): PaymentProvider => {
  if (!paymentProvider) {
    paymentProvider = new NoOpPaymentProvider();
  }
  return paymentProvider;
};

/**
 * Set a custom payment provider (for testing or future integration).
 */
export const setPaymentProvider = (provider: PaymentProvider): void => {
  paymentProvider = provider;
};

/**
 * Check if payment processing is available.
 */
export const isPaymentAvailable = async (): Promise<boolean> => {
  const provider = getPaymentProvider();
  return provider.isAvailable();
};

/**
 * Create a payment intent (placeholder - throws NotImplementedError).
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  description: string
): Promise<PaymentIntent> => {
  const provider = getPaymentProvider();
  return provider.createPaymentIntent(amount, currency, description);
};

/**
 * Confirm a payment (placeholder - throws NotImplementedError).
 */
export const confirmPayment = async (
  paymentIntentId: string,
  paymentMethodId: string
): Promise<PaymentResult> => {
  const provider = getPaymentProvider();
  return provider.confirmPayment(paymentIntentId, paymentMethodId);
};

/**
 * Cancel a payment (placeholder - throws NotImplementedError).
 */
export const cancelPayment = async (paymentIntentId: string): Promise<PaymentResult> => {
  const provider = getPaymentProvider();
  return provider.cancelPayment(paymentIntentId);
};

/**
 * Get a payment intent by ID (placeholder - throws NotImplementedError).
 */
export const getPaymentIntent = async (paymentIntentId: string): Promise<PaymentIntent | null> => {
  const provider = getPaymentProvider();
  return provider.getPaymentIntent(paymentIntentId);
};
