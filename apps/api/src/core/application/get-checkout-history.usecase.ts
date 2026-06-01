import { CheckoutSession } from '../domain/checkout';
import { IGetCheckoutHistory } from '../ports/in/checkout-history.usecase.port';
import { ICheckoutRepository } from '../ports/out/checkout.repo.port';

export class GetCheckoutHistoryUseCase implements IGetCheckoutHistory {
  constructor(private readonly repo: ICheckoutRepository) {}

  execute(userId: string): Promise<CheckoutSession[]> {
    return this.repo.findByUser(userId);
  }
}
