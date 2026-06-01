import { calculateCheckout, calculateSubtotal, calculateTaxes, calculateDiscount, calculateTotal } from '../pricing.engine';
import { PricingConfig } from '../checkout';

describe('pricing engine', () => {
  describe('calculateSubtotal', () => {
    it('sums unit_price * quantity for all items', () => {
      expect(calculateSubtotal([{ name: 'A', unit_price: 10, quantity: 2 }])).toBe(20);
    });
    it('handles multiple items', () => {
      expect(calculateSubtotal([
        { name: 'A', unit_price: 49.99, quantity: 2 },
        { name: 'B', unit_price: 9.99, quantity: 1 },
      ])).toBe(109.97);
    });
    it('rounds to 2 decimal places', () => {
      expect(calculateSubtotal([{ name: 'A', unit_price: 0.1, quantity: 3 }])).toBe(0.30);
    });
  });

  describe('calculateTaxes', () => {
    it('applies 13%', () => {
      expect(calculateTaxes(50)).toBe(6.50);
      expect(calculateTaxes(100)).toBe(13.00);
      expect(calculateTaxes(109.97)).toBe(14.30);
    });
  });

  describe('calculateDiscount', () => {
    it('returns 0 when subtotal <= 100', () => {
      expect(calculateDiscount(50)).toBe(0);
      expect(calculateDiscount(100)).toBe(0);
    });
    it('applies 10% when subtotal > 100', () => {
      expect(calculateDiscount(109.97)).toBe(11.00);
      expect(calculateDiscount(200)).toBe(20.00);
    });
  });

  describe('calculateTotal', () => {
    it('sums subtotal + taxes - discount', () => {
      expect(calculateTotal(50, 6.50, 0)).toBe(56.50);
      expect(calculateTotal(109.97, 14.30, 11.00)).toBe(113.27);
    });
  });

  describe('calculateCheckout with custom config', () => {
    const config: PricingConfig = { taxRate: 0.20, discountThreshold: 50, discountRate: 0.05 };

    it('applies custom tax rate', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 100, quantity: 1 }], config);
      expect(r.taxes).toBe(20);
    });

    it('applies custom discount threshold and rate', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 60, quantity: 1 }], config);
      expect(r.discount).toBe(3); // 60 > 50 → 60 * 0.05
    });

    it('no discount when subtotal is at or below custom threshold', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 50, quantity: 1 }], config);
      expect(r.discount).toBe(0);
    });
  });

  describe('calculateCheckout (acceptance criteria)', () => {
    it('AC-01: subtotal below threshold', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 50, quantity: 1 }]);
      expect(r).toEqual({ subtotal: 50, taxes: 6.50, discount: 0, total: 56.50 });
    });
    it('AC-02: subtotal exactly at threshold', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 100, quantity: 1 }]);
      expect(r).toEqual({ subtotal: 100, taxes: 13, discount: 0, total: 113 });
    });
    it('AC-03: subtotal above threshold', () => {
      const r = calculateCheckout([
        { name: 'A', unit_price: 49.99, quantity: 2 },
        { name: 'B', unit_price: 9.99, quantity: 1 },
      ]);
      expect(r).toEqual({ subtotal: 109.97, taxes: 14.30, discount: 11.00, total: 113.27 });
    });
    it('AC-04: single item', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 25, quantity: 1 }]);
      expect(r).toEqual({ subtotal: 25, taxes: 3.25, discount: 0, total: 28.25 });
    });
    it('AC-05: multiple items, rounding', () => {
      const r = calculateCheckout([{ name: 'A', unit_price: 99.99, quantity: 1 }]);
      expect(r).toEqual({ subtotal: 99.99, taxes: 13.00, discount: 0, total: 112.99 });
    });
  });
});
