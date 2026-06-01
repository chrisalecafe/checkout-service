import { CheckoutItem, CheckoutResult, PricingConfig, DEFAULT_PRICING_CONFIG } from './checkout';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function calculateSubtotal(items: CheckoutItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0));
}

export function calculateTaxes(subtotal: number, config: PricingConfig = DEFAULT_PRICING_CONFIG): number {
  return round2(subtotal * config.taxRate);
}

export function calculateDiscount(subtotal: number, config: PricingConfig = DEFAULT_PRICING_CONFIG): number {
  return subtotal > config.discountThreshold ? round2(subtotal * config.discountRate) : 0;
}

export function calculateTotal(subtotal: number, taxes: number, discount: number): number {
  return round2(subtotal + taxes - discount);
}

export function calculateCheckout(items: CheckoutItem[], config: PricingConfig = DEFAULT_PRICING_CONFIG): CheckoutResult {
  const subtotal = calculateSubtotal(items);
  const taxes = calculateTaxes(subtotal, config);
  const discount = calculateDiscount(subtotal, config);
  const total = calculateTotal(subtotal, taxes, discount);
  return { subtotal, taxes, discount, total };
}
