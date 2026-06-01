import { CheckoutItem, CheckoutResult } from '../domain/checkout';
import { calculateCheckout } from '../domain/pricing.engine';
import { IProcessCheckout } from '../ports/in/checkout.usecase.port';
import { ICheckoutRepository } from '../ports/out/checkout.repo.port';
import { IPricingConfigProvider } from '../ports/out/pricing-config.provider.port';

export class ProcessCheckoutUseCase implements IProcessCheckout {
  constructor(
    private readonly repo: ICheckoutRepository,
    private readonly pricingConfig: IPricingConfigProvider,
  ) {}

  async execute(userId: string, items: CheckoutItem[]): Promise<CheckoutResult> {
    const config = await this.pricingConfig.getConfig();
    const { subtotal, taxes, discount, total } = calculateCheckout(items, config);
    await this.repo.save({ user_id: userId, items, subtotal, taxes, discount, total });
    return { subtotal, taxes, discount, total };
  }
}
