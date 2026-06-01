import { CheckoutSession } from '../../domain/checkout';

export interface IGetCheckoutHistory {
  execute(userId: string): Promise<CheckoutSession[]>;
}
