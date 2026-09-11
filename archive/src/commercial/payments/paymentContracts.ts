/**
 * AFRICAN COMMERCE PAYMENT INFRASTRUCTURE CONTRACTS
 *
 * Foundational types for:
 * - Payment orchestration and routing
 * - Mobile money ecosystems
 * - Cross-border settlements
 * - SME financial operations
 * - Transaction compliance and analytics
 */

/**
 * PHASE 1: PAYMENT ORCHESTRATION CONTRACTS
 */

export type PaymentProvider = 'stripe' | 'mpesa' | 'airtel_money' | 'paypal' | 'bank_transfer' | 'wallet';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'KES' | 'UGX' | 'TZS' | 'NGN' | 'ZAR' | 'GHS';

export interface Transaction {
  transaction_id: string;
  tenant_id: string;
  amount: number;
  currency: CurrencyCode;
  provider: PaymentProvider;
  status: PaymentStatus;
  initiated_at: string;
  completed_at?: string;
  retry_count: number;
  metadata: Record<string, unknown>;
}

export interface TransactionLifecycle {
  transaction_id: string;
  current_stage: 'initiated' | 'validated' | 'authorized' | 'captured' | 'settled' | 'reconciled' | 'failed';
  state_transitions: Array<{
    from: string;
    to: string;
    timestamp: string;
    reason?: string;
  }>;
  last_updated: string;
}

export interface PaymentRoute {
  route_id: string;
  providers: PaymentProvider[];
  currency: CurrencyCode;
  min_amount: number;
  max_amount: number;
  success_rate: number;
  avg_settlement_time_hours: number;
  fees_percentage: number;
}

export interface Settlement {
  settlement_id: string;
  transactions: string[]; // transaction_ids
  total_amount: number;
  currency: CurrencyCode;
  provider: PaymentProvider;
  settled_at: string;
  status: 'pending' | 'verified' | 'completed' | 'failed';
  verification_hash?: string;
}

/**
 * PHASE 2: MOBILE MONEY CONTRACTS
 */

export interface MobileWalletAccount {
  wallet_id: string;
  tenant_id: string;
  provider: 'mpesa' | 'airtel_money' | 'orange_money' | 'mtn_money';
  phone_number: string;
  balance: number;
  currency: CurrencyCode;
  last_synced: string;
  is_active: boolean;
}

export interface MobileMoneyTransaction {
  mobile_transaction_id: string;
  wallet_id: string;
  amount: number;
  direction: 'inbound' | 'outbound';
  reference_number: string;
  timestamp: string;
  status: PaymentStatus;
  offline_synced?: boolean;
}

export interface OfflinePaymentBuffer {
  buffer_id: string;
  wallet_id: string;
  queued_transactions: MobileMoneyTransaction[];
  buffer_size_bytes: number;
  last_synced: string;
  is_syncing: boolean;
}

/**
 * PHASE 3: CROSS-BORDER CONTRACTS
 */

export interface CurrencyExchangeRate {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  timestamp: string;
  source: 'central_bank' | 'market' | 'provider';
  confidence_score: number; // 0-100
}

export interface CrossBorderTransaction {
  transaction_id: string;
  originating_currency: CurrencyCode;
  destination_currency: CurrencyCode;
  originating_amount: number;
  destination_amount: number;
  exchange_rate_used: number;
  corridors: string[]; // e.g., ['KE->UG', 'UG->TZ']
  status: PaymentStatus;
  timestamp: string;
}

export interface PAPSSMessage {
  message_id: string;
  type: 'payment' | 'settlement' | 'inquiry' | 'response';
  sender_country: string;
  receiver_country: string;
  amount: number;
  currency: CurrencyCode;
  reference: string;
  timestamp: string;
}

/**
 * PHASE 4: SME FINANCIAL OPERATIONS
 */

export interface Invoice {
  invoice_id: string;
  tenant_id: string;
  amount: number;
  currency: CurrencyCode;
  issued_date: string;
  due_date: string;
  items: InvoiceItem[];
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_terms: 'immediate' | '30_days' | '60_days' | '90_days';
}

export interface InvoiceItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate?: number;
}

export interface Expense {
  expense_id: string;
  tenant_id: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  description: string;
  receipt_url?: string;
  status: 'submitted' | 'approved' | 'rejected';
}

export interface CashflowProjection {
  projection_id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  projected_inflows: number;
  projected_outflows: number;
  net_cashflow: number;
  confidence_score: number;
}

export interface FinancialHealthMetrics {
  tenant_id: string;
  period_date: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  cash_on_hand: number;
  runway_days: number;
  health_score: number; // 0-100
}

/**
 * PHASE 5: TRUST + COMPLIANCE
 */

export interface AuditTrailEntry {
  entry_id: string;
  entity_type: 'transaction' | 'settlement' | 'wallet' | 'invoice';
  entity_id: string;
  action: string;
  actor: string;
  timestamp: string;
  changes: Record<string, unknown>;
  signature?: string;
}

export interface FraudIndicator {
  indicator_id: string;
  transaction_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  detected_at: string;
  action_taken?: string;
}

export interface ReliabilityScore {
  tenant_id: string;
  score: number; // 0-100
  transaction_success_rate: number;
  payment_history: number;
  settlement_compliance: number;
  timestamp: string;
}

/**
 * PHASE 6: COMMERCIAL ANALYTICS
 */

export interface RevenueFlow {
  flow_id: string;
  tenant_id: string;
  period_date: string;
  total_revenue: number;
  by_source: Record<string, number>;
  growth_rate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface BusinessGrowthSignal {
  signal_id: string;
  tenant_id: string;
  metric: string;
  value: number;
  threshold: number;
  exceeds_threshold: boolean;
  timestamp: string;
}

export interface TransactionPattern {
  pattern_id: string;
  tenant_id: string;
  pattern_type: 'frequency' | 'amount' | 'timing' | 'provider';
  description: string;
  frequency: number;
  confidence: number;
  detected_at: string;
}

export interface EconomicInsight {
  insight_id: string;
  tenant_id: string;
  insight_type: 'risk' | 'opportunity' | 'trend' | 'anomaly';
  description: string;
  impact_score: number; // 0-100
  recommended_action?: string;
  timestamp: string;
}
