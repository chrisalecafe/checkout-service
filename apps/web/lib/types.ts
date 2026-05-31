import { z } from 'zod';

export const checkoutItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit_price: z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be > 0'),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).int().min(1, 'Quantity must be ≥ 1'),
});

export const checkoutResultSchema = z.object({
  subtotal: z.number(),
  taxes: z.number(),
  discount: z.number(),
  total: z.number(),
});

export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
