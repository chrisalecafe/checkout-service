import { PricingConfig } from '../../domain/checkout';

export interface IPricingConfigProvider {
  getConfig(): Promise<PricingConfig>;
}
