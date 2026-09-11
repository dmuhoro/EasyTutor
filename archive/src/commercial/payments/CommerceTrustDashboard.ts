/**
 * COMMERCE TRUST DASHBOARD
 *
 * Unified view of all trust and compliance metrics:
 * - Real-time dashboards
 * - Alerts and notifications
 * - Compliance status
 * - Trust scores
 */

import { ReliabilityScore } from './paymentContracts';

export interface DashboardMetric {
  metric_id: string;
  metric_name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  last_updated: string;
}

export interface ComplianceStatus {
  compliant: boolean;
  violations: string[];
  last_audit: string;
  next_audit: string;
}

export interface TrustDashboard {
  dashboard_id: string;
  tenant_id: string;
  overall_trust_score: number;
  metrics: DashboardMetric[];
  compliance_status: ComplianceStatus;
  alerts: Array<{ alert_id: string; message: string; severity: 'info' | 'warning' | 'critical' }>;
  generated_at: string;
}

export class CommerceTrustDashboard {
  private dashboards: Map<string, TrustDashboard> = new Map();
  private alerts: Map<string, Array<{ alert_id: string; message: string; severity: string; timestamp: string }>> =
    new Map();

  async generateDashboard(
    tenant_id: string,
    reliabilityScore: ReliabilityScore,
    complianceData: { kycVerified: boolean; amlCleared: boolean; regulatoryOk: boolean }
  ): Promise<TrustDashboard> {
    const metrics: DashboardMetric[] = [
      {
        metric_id: 'success_rate',
        metric_name: 'Transaction Success Rate',
        value: reliabilityScore.transaction_success_rate,
        threshold: 95,
        status:
          reliabilityScore.transaction_success_rate >= 95
            ? 'healthy'
            : reliabilityScore.transaction_success_rate >= 85
              ? 'warning'
              : 'critical',
        last_updated: reliabilityScore.timestamp,
      },
      {
        metric_id: 'settlement_compliance',
        metric_name: 'Settlement Compliance',
        value: reliabilityScore.settlement_compliance,
        threshold: 98,
        status:
          reliabilityScore.settlement_compliance >= 98
            ? 'healthy'
            : reliabilityScore.settlement_compliance >= 90
              ? 'warning'
              : 'critical',
        last_updated: reliabilityScore.timestamp,
      },
      {
        metric_id: 'payment_history',
        metric_name: 'Payment History Score',
        value: reliabilityScore.payment_history,
        threshold: 85,
        status:
          reliabilityScore.payment_history >= 85
            ? 'healthy'
            : reliabilityScore.payment_history >= 70
              ? 'warning'
              : 'critical',
        last_updated: reliabilityScore.timestamp,
      },
    ];

    const complianceStatus: ComplianceStatus = {
      compliant: complianceData.kycVerified && complianceData.amlCleared && complianceData.regulatoryOk,
      violations: this.identifyViolations(complianceData),
      last_audit: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      next_audit: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
    };

    const overallScore =
      (reliabilityScore.score +
        (complianceStatus.compliant ? 100 : 60) +
        metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length) /
      3;

    const tenantAlerts = this.getTenantAlerts(tenant_id);
    const alerts = tenantAlerts
      .slice(-10)
      .map(a => ({ alert_id: a.alert_id, message: a.message, severity: a.severity as 'info' | 'warning' | 'critical' }));

    const dashboard: TrustDashboard = {
      dashboard_id: `DASH-${Date.now()}`,
      tenant_id,
      overall_trust_score: Math.round(overallScore),
      metrics,
      compliance_status: complianceStatus,
      alerts,
      generated_at: new Date().toISOString(),
    };

    this.dashboards.set(tenant_id, dashboard);
    return dashboard;
  }

  async createAlert(
    tenant_id: string,
    message: string,
    severity: 'info' | 'warning' | 'critical'
  ): Promise<void> {
    const alert = {
      alert_id: `ALERT-${Date.now()}`,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };

    const tenantAlerts = this.alerts.get(tenant_id) || [];
    tenantAlerts.push(alert);

    // Keep only last 1000 alerts
    if (tenantAlerts.length > 1000) {
      tenantAlerts.shift();
    }

    this.alerts.set(tenant_id, tenantAlerts);
  }

  private identifyViolations(complianceData: { kycVerified: boolean; amlCleared: boolean; regulatoryOk: boolean }): string[] {
    const violations: string[] = [];

    if (!complianceData.kycVerified) violations.push('KYC verification not completed');
    if (!complianceData.amlCleared) violations.push('AML screening not cleared');
    if (!complianceData.regulatoryOk) violations.push('Regulatory requirements not met');

    return violations;
  }

  private getTenantAlerts(tenant_id: string): Array<{ alert_id: string; message: string; severity: string; timestamp: string }> {
    return this.alerts.get(tenant_id) || [];
  }

  getDashboard(tenant_id: string): TrustDashboard | undefined {
    return this.dashboards.get(tenant_id);
  }

  getAllAlerts(tenant_id: string): Array<{ alert_id: string; message: string; severity: string; timestamp: string }> {
    return this.alerts.get(tenant_id) || [];
  }

  clearAlerts(tenant_id: string): void {
    this.alerts.delete(tenant_id);
  }

  getComplianceReport(tenant_id: string): ComplianceStatus | undefined {
    return this.dashboards.get(tenant_id)?.compliance_status;
  }
}
