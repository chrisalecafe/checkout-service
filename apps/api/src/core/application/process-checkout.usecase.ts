import { CheckoutItem, CheckoutResult } from '../domain/checkout';
import { calculateCheckout } from '../domain/pricing.engine';
import { IProcessCheckout } from '../ports/in/checkout.usecase.port';
import { ICheckoutRepository } from '../ports/out/checkout.repo.port';

export class ProcessCheckoutUseCase implements IProcessCheckout {
  constructor(private readonly repo: ICheckoutRepository) {}

  async execute(userId: string, items: CheckoutItem[]): Promise<CheckoutResult> {
    const { subtotal, taxes, discount, total } = calculateCheckout(items);
    await this.repo.save({ user_id: userId, items, subtotal, taxes, discount, total });
    return { subtotal, taxes, discount, total };
  }
}
