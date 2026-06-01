import { DEFAULT_PRICING_CONFIG, PricingConfig } from '../../../core/domain/checkout';
import { IPricingConfigProvider } from '../../../core/ports/out/pricing-config.provider.port';

export class EnvPricingConfigProvider implements IPricingConfigProvider {
  async getConfig(): Promise<PricingConfig> {
    const taxRate = parseFloat(process.env.PRICING_TAX_RATE ?? '');
    const discountThreshold = parseFloat(process.env.PRICING_DISCOUNT_THRESHOLD ?? '');
    const discountRate = parseFloat(process.env.PRICING_DISCOUNT_RATE ?? '');

    return {
      taxRate: isFinite(taxRate) ? taxRate : DEFAULT_PRICING_CONFIG.taxRate,
      discountThreshold: isFinite(discountThreshold) ? discountThreshold : DEFAULT_PRICING_CONFIG.discountThreshold,
      discountRate: isFinite(discountRate) ? discountRate : DEFAULT_PRICING_CONFIG.discountRate,
    };
  }
}
