import { CheckoutItem, CheckoutResult } from './checkout';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function calculateSubtotal(items: CheckoutItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0));
}

export function calculateTaxes(subtotal: number): number {
  return round2(subtotal * 0.13);
}

export function calculateDiscount(subtotal: number): number {
  return subtotal > 100 ? round2(subtotal * 0.10) : 0;
}

export function calculateTotal(subtotal: number, taxes: number, discount: number): number {
  return round2(subtotal + taxes - discount);
}

export function calculateCheckout(items: CheckoutItem[]): CheckoutResult {
  const subtotal = calculateSubtotal(items);
  const taxes = calculateTaxes(subtotal);
  const discount = calculateDiscount(subtotal);
  const total = calculateTotal(subtotal, taxes, discount);
  return { subtotal, taxes, discount, total };
}
