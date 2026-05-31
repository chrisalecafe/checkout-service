import { ProcessCheckoutUseCase } from '../process-checkout.usecase';
import { ICheckoutRepository } from '../../ports/out/checkout.repo.port';
import { CheckoutItem, CheckoutSession } from '../../domain/checkout';

const makeSession = (overrides: Partial<CheckoutSession> = {}): CheckoutSession => ({
  id: 'uuid-1',
  user_id: 'user-1',
  items: [],
  subtotal: 0,
  taxes: 0,
  discount: 0,
  total: 0,
  created_at: new Date('2026-01-01'),
  ...overrides,
});

describe('ProcessCheckoutUseCase', () => {
  let repo: jest.Mocked<ICheckoutRepository>;
  let useCase: ProcessCheckoutUseCase;

  beforeEach(() => {
    repo = { save: jest.fn() };
    useCase = new ProcessCheckoutUseCase(repo);
  });

  it('returns correct pricing for a single item below the discount threshold', async () => {
    repo.save.mockResolvedValue(makeSession());
    const items: CheckoutItem[] = [{ name: 'A', unit_price: 50, quantity: 1 }];

    const result = await useCase.execute('user-1', items);

    expect(result).toEqual({ subtotal: 50, taxes: 6.5, discount: 0, total: 56.5 });
  });

  it('returns correct pricing when subtotal is exactly at the discount threshold', async () => {
    repo.save.mockResolvedValue(makeSession());
    const items: CheckoutItem[] = [{ name: 'A', unit_price: 100, quantity: 1 }];

    const result = await useCase.execute('user-1', items);

    expect(result).toEqual({ subtotal: 100, taxes: 13, discount: 0, total: 113 });
  });

  it('applies 10% discount when subtotal exceeds threshold', async () => {
    repo.save.mockResolvedValue(makeSession());
    const items: CheckoutItem[] = [
      { name: 'A', unit_price: 49.99, quantity: 2 },
      { name: 'B', unit_price: 9.99, quantity: 1 },
    ];

    const result = await useCase.execute('user-1', items);

    expect(result).toEqual({ subtotal: 109.97, taxes: 14.3, discount: 11, total: 113.27 });
  });

  it('persists the session with correct values', async () => {
    repo.save.mockResolvedValue(makeSession());
    const items: CheckoutItem[] = [{ name: 'A', unit_price: 50, quantity: 1 }];

    await useCase.execute('user-1', items);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith({
      user_id: 'user-1',
      items,
      subtotal: 50,
      taxes: 6.5,
      discount: 0,
      total: 56.5,
    });
  });

  it('persists with the correct userId', async () => {
    repo.save.mockResolvedValue(makeSession());
    const items: CheckoutItem[] = [{ name: 'X', unit_price: 10, quantity: 1 }];

    await useCase.execute('user-abc', items);

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-abc' }));
  });

  it('propagates repository errors', async () => {
    repo.save.mockRejectedValue(new Error('DB failure'));
    const items: CheckoutItem[] = [{ name: 'A', unit_price: 50, quantity: 1 }];

    await expect(useCase.execute('user-1', items)).rejects.toThrow('DB failure');
  });
});
