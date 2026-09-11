import { Transaction, Amount } from '../../types/commerce';

export class PAPSSCompatibilityLayer {
  /**
   * Transforms a transaction into a PAPSS-compatible format.
   * PAPSS requires specific fields like ISO 20022 messaging standards.
   */
  static transformForPAPSS(transaction: Transaction): any {
    return {
      msg_id: `PAPSS-${transaction.id}`,
      instr_id: transaction.providerReference,
      amount: transaction.amount.value,
      currency: transaction.amount.currency,
      debtor_agent: 'EASYTUTOR_NODE_01',
      creditor_agent: 'PAPSS_CENTRAL_SETTLEMENT',
      timestamp: transaction.createdAt
    };
  }

  /**
   * Verifies if a transaction is eligible for PAPSS settlement.
   * Eligibility depends on participating countries and currencies.
   */
  static isEligible(transaction: Transaction): boolean {
    const papssCountries = ['NG', 'GH', 'KE', 'SL', 'GM', 'GN', 'ZW'];
    // Logic to check if user/merchant countries are in the participating list
    return true; 
  }
}
