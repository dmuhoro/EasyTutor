import { Currency } from '../../types/commerce';

export class RegionalCurrencyResolver {
  private static CURRENCIES: Record<string, Currency> = {
    'KE': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    'UG': { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
    'TZ': { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
    'RW': { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
    'NG': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    'GH': { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
    'ZA': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  };

  /**
   * Resolves the currency for a given country code (ISO 3166-1 alpha-2).
   */
  static resolveByCountryCode(countryCode: string): Currency {
    return this.CURRENCIES[countryCode.toUpperCase()] || { code: 'USD', symbol: '$', name: 'US Dollar' };
  }

  /**
   * Returns a list of all supported regional currencies.
   */
  static getSupportedCurrencies(): Currency[] {
    return Object.values(this.CURRENCIES);
  }
}
