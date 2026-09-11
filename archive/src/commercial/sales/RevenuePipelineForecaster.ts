import { OfferPackagingEngine } from './OfferPackagingEngine';
import { Telemetry } from '../../observability/telemetry';

/**
 * REVENUE PIPELINE FORECASTER
 * 
 * Aggregates active sales offers and historical conversion rates to predict 
 * upcoming monthly recurring revenue (MRR) for the ecosystem.
 */
export class RevenuePipelineForecaster {
  static async forecastRevenue(tenantIds: string[]): Promise<number> {
    console.log(`[SALES] Forecasting revenue for pipeline...`);
    
    let totalForecast = 0;
    
    for (const id of tenantIds) {
      const offer = await OfferPackagingEngine.generateOffer(id, 'standard');
      totalForecast += offer.estimated_mrr_usd * (offer.conversion_probability / 100);
    }

    Telemetry.emit({
      event: 'REVENUE_FORECASTED',
      source: 'platform',
      operationType: 'billing',
      payload: { total_forecast_usd: totalForecast }
    });

    return totalForecast;
  }
}
