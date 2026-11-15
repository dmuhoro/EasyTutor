/**
 * Local Context Data for EasyTutor
 *
 * Provides country-specific educational context (currencies, SI units,
 * locally familiar scenarios) used to ground AI tutor explanations in
 * learners' lived experience. Data is organised by ISO-3166-1 alpha-2
 * country code.
 *
 * Countries not present in this map fall back to "global" context
 * (generic SI units, USD, generic examples).
 *
 * All data is factual and non-controversial: currency ISO codes, SI unit
 * names, and common place names/transport/food terms. No syllabi, exam
 * boards, or grading schemes are invented here.
 */

export interface LocalContext {
  country: string;           // ISO-3166-1 alpha-2 (KE, NG, GH, UG, TZ, ET, ZA, ...)
  countryName: string;       // Human-readable country name
  currency: { code: string; symbol: string; name: string; plural: string };
  units: { length: string; mass: string; temperature: string; volume: string };
  scenarios: {
    transport: string[];     // e.g. ["matatu", "boda boda"]
    market: string[];        // e.g. ["produce stall", "fish market"]
    place: string[];         // e.g. ["Nairobi", "Mombasa", "Kisumu"]
    food: string[];          // e.g. ["ugali", "sukuma wiki", "nyama choma"]
  };
}

/**
 * Kenya - East African Community, uses Kenyan Shilling (KES).
 */
const KE: LocalContext = {
  country: 'KE',
  countryName: 'Kenya',
  currency: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', plural: 'Kenyan Shillings' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['matatu', 'boda boda', 'tuktuk'],
    market: ['produce stall', 'fish market', 'butchery', 'duka'],
    place: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Thika'],
    food: ['ugali', 'sukuma wiki', 'nyama choma', 'chapati', 'mandazi'],
  },
};

/**
 * Nigeria - West Africa, uses Nigerian Naira (NGN).
 */
const NG: LocalContext = {
  country: 'NG',
  countryName: 'Nigeria',
  currency: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', plural: 'Naira' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['danfo', 'keke', 'okada'],
    market: ['open market', 'provisions store', 'suya spot', 'market stall'],
    place: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City'],
    food: ['jollof rice', 'egusi soup', 'suya', 'akara', 'pounded yam'],
  },
};

/**
 * Ghana - West Africa, uses Ghanaian Cedi (GHS).
 */
const GH: LocalContext = {
  country: 'GH',
  countryName: 'Ghana',
  currency: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', plural: 'Cedis' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['trotro', 'okada'],
    market: ['market stall', 'chop bar', 'provisions shop'],
    place: ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Takoradi'],
    food: ['jollof rice', 'waakye', 'banku', 'kelewele', 'fufu'],
  },
};

/**
 * Uganda - East Africa, uses Ugandan Shilling (UGX).
 */
const UG: LocalContext = {
  country: 'UG',
  countryName: 'Uganda',
  currency: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', plural: 'Ugandan Shillings' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['boda boda', 'matatu'],
    market: ['market stall', 'produce market', 'butchery'],
    place: ['Kampala', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'],
    food: ['matooke', 'posho', 'rolex', 'groundnut sauce', 'chips'],
  },
};

/**
 * Tanzania - East Africa, uses Tanzanian Shilling (TZS).
 */
const TZ: LocalContext = {
  country: 'TZ',
  countryName: 'Tanzania',
  currency: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', plural: 'Tanzanian Shillings' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['dala dala', 'boda boda'],
    market: ['market stall', 'produce market', 'fish market'],
    place: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Zanzibar'],
    food: ['ugali', 'nyama choma', 'pilau', 'samosa', 'chips mayai'],
  },
};

/**
 * Ethiopia - East Africa, uses Ethiopian Birr (ETB).
 */
const ET: LocalContext = {
  country: 'ET',
  countryName: 'Ethiopia',
  currency: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', plural: 'Ethiopian Birr' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['blue and white minibus', 'bajaj'],
    market: ['market stall', 'produce market', 'butchery'],
    place: ['Addis Ababa', 'Dire Dawa', 'Nazret', 'Gondar', 'Mekele'],
    food: ['injera', 'doro wat', 'kitfo', 'tibs', 'shiro'],
  },
};

/**
 * South Africa - Southern Africa, uses South African Rand (ZAR).
 */
const ZA: LocalContext = {
  country: 'ZA',
  countryName: 'South Africa',
  currency: { code: 'ZAR', symbol: 'R', name: 'South African Rand', plural: 'Rand' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['minibus taxi', 'boda boda'],
    market: ['market stall', 'produce market', 'spaza shop'],
    place: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'],
    food: ['bunny chow', 'pap and wors', 'bobotie', 'samp and beans', 'milk tart'],
  },
};

/**
 * Global fallback context - used when no country-specific data exists
 * or when the learner selects "global" examples.
 */
const GLOBAL: LocalContext = {
  country: 'GLOBAL',
  countryName: 'Global',
  currency: { code: 'USD', symbol: '$', name: 'US Dollar', plural: 'US Dollars' },
  units: { length: 'kilometres', mass: 'kilograms', temperature: 'degrees Celsius', volume: 'litres' },
  scenarios: {
    transport: ['bus', 'train', 'taxi'],
    market: ['grocery store', 'supermarket', 'butcher'],
    place: ['city centre', 'town square', 'railway station'],
    food: ['bread', 'rice', 'vegetables', 'fruit', 'meat'],
  },
};

const LOCAL_CONTEXT_MAP: Record<string, LocalContext> = {
  KE, NG, GH, UG, TZ, ET, ZA,
};

/**
 * Get the local context for a given country code.
 * Returns the global fallback if no country-specific data exists.
 */
export const getLocalContext = (countryCode: string | undefined | null): LocalContext => {
  if (!countryCode) return GLOBAL;
  return LOCAL_CONTEXT_MAP[countryCode.toUpperCase()] ?? GLOBAL;
};

/**
 * Format a currency amount using the local context's currency.
 */
export const formatCurrency = (amount: number, context: LocalContext): string => {
  return `${context.currency.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format a distance using local units.
 */
export const formatDistance = (metres: number, context: LocalContext): string => {
  const km = metres / 1000;
  return `${km.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${context.units.length}`;
};

/**
 * Format a mass using local units.
 */
export const formatMass = (grams: number, context: LocalContext): string => {
  const kg = grams / 1000;
  return `${kg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${context.units.mass}`;
};

/**
 * Format a temperature using local units.
 */
export const formatTemperature = (celsius: number, context: LocalContext): string => {
  return `${celsius.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}°${context.units.temperature === 'degrees Celsius' ? 'C' : 'F'}`;
};

/**
 * Randomly pick an element from an array (deterministic seed-based).
 */
export const pickRandom = <T>(items: T[], seed: string): T => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return items[Math.abs(hash) % items.length];
};

/**
 * Get a random local example from a category (transport, market, place, food).
 */
export const getLocalExample = (context: LocalContext, category: keyof LocalContext['scenarios'], seed: string): string => {
  return pickRandom(context.scenarios[category], seed);
};

/**
 * Build a locale-specific instruction block for the AI tutor system prompt.
 * Returns an empty string when local context is not enabled (global mode).
 */
export const buildLocalContextPrompt = (context: LocalContext | null): string => {
  if (!context || context.country === 'GLOBAL') {
    return '';
  }

  const currencyExample = `Example: ${formatCurrency(1500, context)} buys ${pickRandom(context.scenarios.food, 'currency-food')} at a local ${pickRandom(context.scenarios.market, 'currency-market')}.`;
  const distanceExample = `Example: The distance from ${pickRandom(context.scenarios.place, 'distance-place-1')} to ${pickRandom(context.scenarios.place, 'distance-place-2')} is about ${formatDistance(45000, context)}.`;
  const transportExample = `Example: A ${pickRandom(context.scenarios.transport, 'transport-example')} is a common way to travel around ${pickRandom(context.scenarios.place, 'transport-place')}.`;

  return `
LOCAL CONTEXT (${context.countryName}):
- Use ${context.currency.name} (${context.currency.code}, ${context.currency.symbol}) for all monetary examples. ${currencyExample}
- Distances are in ${context.units.length}, mass in ${context.units.mass}, temperature in ${context.units.temperature}. ${distanceExample}
- Use familiar local references such as ${pickRandom(context.scenarios.transport, 'transport')}, ${pickRandom(context.scenarios.place, 'place')}, and ${pickRandom(context.scenarios.food, 'food')}. ${transportExample}
- Ground abstract concepts in locally familiar scenarios (markets, transport, food, daily life) wherever they aid understanding.`;
};
