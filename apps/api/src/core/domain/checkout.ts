export interface CheckoutItem {
  name: string;
  unit_price: number;
  quantity: number;
}

export interface PricingConfig {
  taxRate: number;           // e.g. 0.13 for 13%
  discountThreshold: number; // e.g. 100 — subtotal must exceed this
  discountRate: number;      // e.g. 0.10 for 10%
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  taxRate: 0.13,
  discountThreshold: 100,
  discountRate: 0.10,
};

export interface CheckoutSession {
  id: string;
  user_id: string;
  items: CheckoutItem[];
  subtotal: number;
  taxes: number;
  discount: number;
  total: number;
  created_at: Date;
}

export interface CheckoutResult {
  subtotal: number;
  taxes: number;
  discount: number;
  total: number;
}
