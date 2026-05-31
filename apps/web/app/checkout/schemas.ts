import { z } from 'zod';
import { checkoutItemSchema } from '../../lib/types';

export const checkoutFormSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required'),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
