export interface CheckoutItem {
  name: string;
  unit_price: number;
  quantity: number;
}

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
