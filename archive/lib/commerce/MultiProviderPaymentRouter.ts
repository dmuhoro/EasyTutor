import { PaymentProvider, PaymentRequest } from '../../types/commerce';

export class MultiProviderPaymentRouter {
  /**
   * Routes a payment request to the most appropriate provider based on
   * region, availability, and user preference.
   */
  static route(request: PaymentRequest): PaymentProvider {
    // For now, return the provider requested in the payload
    // In a production environment, this would involve complex logic
    // such as checking provider health, cost optimization, etc.
    return request.provider;
  }

  /**
   * Returns a list of supported providers for a given currency or region.
   */
  static getSupportedProviders(currency: string): PaymentProvider[] {
    switch (currency) {
      case 'KES':
        return ['MPESA', 'AIRTEL_MONEY', 'FLUTTERWAVE', 'PAYSTACK'];
      case 'UGX':
      case 'GHS':
      case 'NGN':
        return ['MTN_MOMO', 'FLUTTERWAVE', 'PAYSTACK'];
      case 'USD':
      case 'EUR':
        return ['STRIPE', 'FLUTTERWAVE'];
      default:
        return ['FLUTTERWAVE'];
    }
  }
}
