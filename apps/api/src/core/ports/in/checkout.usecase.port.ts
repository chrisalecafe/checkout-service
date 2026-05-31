import { CheckoutItem, CheckoutResult } from '../../domain/checkout';

export interface IProcessCheckout {
  execute(userId: string, items: CheckoutItem[]): Promise<CheckoutResult>;
}
