/**
 * AFRICAN COMMERCE PAYMENT INFRASTRUCTURE
 *
 * Complete export of all payment, commerce, and financial systems
 * organized by implementation phase.
 */

// PHASE 1: Payment Orchestration
export { PaymentOrchestrationEngine, type RoutingDecision } from './PaymentOrchestrationEngine';
export { TransactionLifecycleManager, type TransactionStage } from './TransactionLifecycleManager';
export { PaymentRetryCoordinator, type RetryPolicy } from './PaymentRetryCoordinator';
export { SettlementVerificationEngine, type SettlementVerification } from './SettlementVerificationEngine';
export {
  MultiProviderPaymentRouter,
  type ProviderCapability,
  type RoutingDecision as RouterRoutingDecision,
} from './MultiProviderPaymentRouter';

// PHASE 2: Mobile Money & Local Payments
export { MpesaIntegrationRuntime, type MpesaPaymentRequest, type MpesaPaymentResponse } from './MpesaIntegrationRuntime';
export { AirtelMoneyConnector, type AirtelPaymentRequest } from './AirtelMoneyConnector';
export { MobileWalletLedger, type WalletLedgerEntry } from './MobileWalletLedger';
export {
  OfflinePaymentSynchronizationEngine,
  type SyncReport,
} from './OfflinePaymentSynchronizationEngine';

// PHASE 3: Cross-Border Commerce
export { RegionalCurrencyResolver, type RateSource } from './RegionalCurrencyResolver';
export { FXOptimizationEngine, type FXQuote, type OptimizationStrategy } from './FXOptimizationEngine';
export { PAPSSCompatibilityLayer, type PAPSSCompliantTransaction } from './PAPSSCompatibilityLayer';
export {
  CrossBorderSettlementCoordinator,
  type SettlementCorridor,
  type CrossBorderSettlement,
} from './CrossBorderSettlementCoordinator';

// PHASE 4: SME Financial Operations
export { InvoiceLifecycleManager, type InvoiceReminder } from './InvoiceLifecycleManager';
export { ExpenseTrackingRuntime, type ExpenseCategory, type ExpenseReport } from './ExpenseTrackingRuntime';
export { CashflowIntelligenceEngine, type CashflowTrend, type CashflowAlert } from './CashflowIntelligenceEngine';
export { FinancialHealthAnalyzer, type FinancialRecommendation } from './FinancialHealthAnalyzer';

// PHASE 5: Trust & Compliance
export { TransactionAuditTrailEngine, type AuditQueryResult } from './TransactionAuditTrailEngine';
export { PaymentFraudMonitor, type FraudPattern } from './PaymentFraudMonitor';
export { FinancialReliabilityScorer, type ScoreHistory } from './FinancialReliabilityScorer';
export { CommerceTrustDashboard, type DashboardMetric, type TrustDashboard } from './CommerceTrustDashboard';

// PHASE 6: Commercial Analytics
export { RevenueFlowAnalyzer, type RevenueSource } from './RevenueFlowAnalyzer';
export { BusinessGrowthCorrelationEngine, type CorrelationAnalysis, type GrowthDriver } from './BusinessGrowthCorrelationEngine';
export { TransactionPatternIntelligence, type BehaviorProfile } from './TransactionPatternIntelligence';
export { EconomicInsightGenerator, type InsightCluster } from './EconomicInsightGenerator';

// Core Contracts (used across all phases)
export * from './paymentContracts';
