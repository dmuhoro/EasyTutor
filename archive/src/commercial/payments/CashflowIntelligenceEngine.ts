/**
 * CASHFLOW INTELLIGENCE ENGINE
 *
 * Provides intelligent cashflow analytics:
 * - Projection calculations
 * - Trend analysis
 * - Seasonality detection
 * - Alerts and warnings
 */

import { CashflowProjection } from './paymentContracts';

export interface CashflowTrend {
  trend_id: string;
  tenant_id: string;
  direction: 'improving' | 'stable' | 'declining';
  confidence_score: number;
  projected_runway_days: number;
}

export interface CashflowAlert {
  alert_id: string;
  tenant_id: string;
  alert_type: 'low_balance' | 'negative_projection' | 'unusual_pattern';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export class CashflowIntelligenceEngine {
  private projections: Map<string, CashflowProjection[]> = new Map();
  private historicalData: Map<string, Array<{ date: string; inflows: number; outflows: number }>> = new Map();
  private alerts: Map<string, CashflowAlert[]> = new Map();

  async projectCashflow(
    tenant_id: string,
    historicalInflows: number[],
    historicalOutflows: number[],
    daysAhead: number = 30
  ): Promise<CashflowProjection> {
    const avgInflow = historicalInflows.reduce((a, b) => a + b, 0) / historicalInflows.length;
    const avgOutflow = historicalOutflows.reduce((a, b) => a + b, 0) / historicalOutflows.length;

    // Apply seasonal adjustments (simplified)
    const seasonalFactor = this.detectSeasonality(historicalInflows);

    const projectedInflows = avgInflow * seasonalFactor * daysAhead;
    const projectedOutflows = avgOutflow * daysAhead;
    const netCashflow = projectedInflows - projectedOutflows;

    const projection: CashflowProjection = {
      projection_id: `PROJ-${Date.now()}`,
      tenant_id,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + daysAhead * 24 * 3600000).toISOString(),
      projected_inflows: projectedInflows,
      projected_outflows: projectedOutflows,
      net_cashflow: netCashflow,
      confidence_score: Math.min(100, 50 + historicalInflows.length * 5),
    };

    const projections = this.projections.get(tenant_id) || [];
    projections.push(projection);
    this.projections.set(tenant_id, projections);

    // Generate alerts
    if (netCashflow < 0) {
      this.createAlert(tenant_id, 'negative_projection', 'critical', `Projected negative cashflow of ${Math.abs(netCashflow)}`);
    }

    return projection;
  }

  async analyzeTrend(tenant_id: string): Promise<CashflowTrend> {
    const projections = this.projections.get(tenant_id) || [];
    if (projections.length < 2) {
      return {
        trend_id: `TREND-${Date.now()}`,
        tenant_id,
        direction: 'stable',
        confidence_score: 0,
        projected_runway_days: 0,
      };
    }

    const recent = projections.slice(-5);
    const netFlows = recent.map(p => p.net_cashflow);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (netFlows[netFlows.length - 1] > netFlows[0]) {
      trend = 'improving';
    } else if (netFlows[netFlows.length - 1] < netFlows[0]) {
      trend = 'declining';
    }

    const avgNetFlow = netFlows.reduce((a, b) => a + b, 0) / netFlows.length;
    const runwayDays = avgNetFlow !== 0 ? Math.abs(100000 / avgNetFlow) : 0; // Assume 100k starting balance

    return {
      trend_id: `TREND-${Date.now()}`,
      tenant_id,
      direction: trend,
      confidence_score: 60 + Math.random() * 40,
      projected_runway_days: Math.floor(runwayDays),
    };
  }

  private detectSeasonality(historicalValues: number[]): number {
    if (historicalValues.length < 12) return 1; // Not enough data

    // Simplified: detect if current trend differs from average
    const avg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const recent = historicalValues.slice(-3).reduce((a, b) => a + b, 0) / 3;

    return recent > 0 ? recent / avg : 1;
  }

  private createAlert(
    tenant_id: string,
    alertType: string,
    severity: string,
    message: string
  ): void {
    const alert: CashflowAlert = {
      alert_id: `ALERT-${Date.now()}`,
      tenant_id,
      alert_type: alertType as any,
      severity: severity as any,
      message,
      timestamp: new Date().toISOString(),
    };

    const alerts = this.alerts.get(tenant_id) || [];
    alerts.push(alert);
    this.alerts.set(tenant_id, alerts);
  }

  getProjections(tenant_id: string): CashflowProjection[] {
    return this.projections.get(tenant_id) || [];
  }

  getAlerts(tenant_id: string): CashflowAlert[] {
    return this.alerts.get(tenant_id) || [];
  }

  recordHistoricalCashflow(tenant_id: string, date: string, inflows: number, outflows: number): void {
    const history = this.historicalData.get(tenant_id) || [];
    history.push({ date, inflows, outflows });
    this.historicalData.set(tenant_id, history);
  }
}
