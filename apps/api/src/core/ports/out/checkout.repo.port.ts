import { CheckoutItem, CheckoutSession } from '../../domain/checkout';

export interface ICheckoutRepository {
  save(session: Omit<CheckoutSession, 'id' | 'created_at'>): Promise<CheckoutSession>;
}
