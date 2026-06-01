import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutPage from '../page';

// --- mocks ---
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockLogout = jest.fn();
let mockToken: string | null = 'test-token';
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({ token: mockToken, logout: mockLogout }),
}));

jest.mock('../../../lib/api', () => ({
  checkout: jest.fn(),
}));
import { checkout as mockCheckout } from '../../../lib/api';

const RESULT = { subtotal: 10.0, taxes: 1.30, discount: 1.0, total: 10.30 };

// --- helpers ---
function setup() {
  const user = userEvent.setup();
  render(<CheckoutPage />);
  return { user };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = 'test-token';
});

// ── auth guard ──────────────────────────────────────────────────────────────
describe('CheckoutPage — auth guard', () => {
  it('redirects to /login when there is no token', () => {
    mockToken = null;
    render(<CheckoutPage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

// ── rendering ──────────────────────────────────────────────────────────────
describe('CheckoutPage — rendering', () => {
  it('renders the page title and navbar logo', () => {
    setup();
    expect(screen.getByText(/new checkout/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /simple checkout/i })).toBeInTheDocument();
  });

  it('renders one item row by default', () => {
    setup();
    expect(screen.getAllByLabelText(/item name/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/price/i)).toHaveLength(1);
    expect(screen.getAllByLabelText(/qty/i)).toHaveLength(1);
  });

  it('renders the calculate checkout button', () => {
    setup();
    expect(screen.getByRole('button', { name: /calculate checkout/i })).toBeInTheDocument();
  });
});

// ── item management ─────────────────────────────────────────────────────────
describe('CheckoutPage — item management', () => {
  it('adds a new row when "+ Add item" is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByLabelText(/item name/i)).toHaveLength(2);
  });

  it('remove button is disabled when only one row exists', () => {
    setup();
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });

  it('removes the correct row when Remove is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    const nameInputs = screen.getAllByLabelText(/item name/i);
    await user.type(nameInputs[0], 'Apple');
    await user.type(nameInputs[1], 'Banana');
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);
    expect(screen.getAllByLabelText(/item name/i)).toHaveLength(1);
  });
});

// ── validation ──────────────────────────────────────────────────────────────
describe('CheckoutPage — Zod validation', () => {
  it('shows field errors without calling API when item name is empty', async () => {
    setup();
    const form = screen.getByRole('button', { name: /calculate checkout/i }).closest('form')!;
    // Wrap in act so React 19 flushes all batched state updates synchronously.
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => /item name is required/i.test(a.textContent ?? ''))).toBe(true);
    }, { timeout: 3000 });
    expect(mockCheckout).not.toHaveBeenCalled();
  });
});

// ── success flow ────────────────────────────────────────────────────────────
describe('CheckoutPage — success', () => {
  it('calls checkout API and shows result summary', async () => {
    (mockCheckout as jest.Mock).mockResolvedValue(RESULT);
    const { user } = setup();
    await user.type(screen.getByLabelText(/item name/i), 'Apple');
    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), '10');
    await user.clear(screen.getByLabelText(/qty/i));
    await user.type(screen.getByLabelText(/qty/i), '1');
    await user.click(screen.getByRole('button', { name: /calculate checkout/i }));
    expect(await screen.findByText(/summary/i)).toBeInTheDocument();
    expect(screen.getByText('$10.30')).toBeInTheDocument();
    expect(mockCheckout).toHaveBeenCalledWith(
      'test-token',
      expect.arrayContaining([expect.objectContaining({ name: 'Apple' })]),
    );
  });
});

// ── error flow ──────────────────────────────────────────────────────────────
describe('CheckoutPage — API error', () => {
  it('shows API error message when checkout fails', async () => {
    (mockCheckout as jest.Mock).mockRejectedValue(new Error('Request failed'));
    const { user } = setup();
    await user.type(screen.getByLabelText(/item name/i), 'Apple');
    await user.type(screen.getByLabelText(/price/i), '10');
    await user.click(screen.getByRole('button', { name: /calculate checkout/i }));
    expect(await screen.findByText(/request failed/i)).toBeInTheDocument();
  });
});

// ── loading state ───────────────────────────────────────────────────────────
describe('CheckoutPage — loading state', () => {
  it('disables all action buttons while request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    (mockCheckout as jest.Mock).mockReturnValue(new Promise(r => (resolve = r)));
    const { user } = setup();
    await user.type(screen.getByLabelText(/item name/i), 'Apple');
    await user.type(screen.getByLabelText(/price/i), '10');
    await user.click(screen.getByRole('button', { name: /calculate checkout/i }));
    expect(screen.getByRole('button', { name: /calculate checkout/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeDisabled();
    resolve(RESULT);
  });
});

// ── sign out ────────────────────────────────────────────────────────────────
describe('CheckoutPage — sign out', () => {
  it('calls logout and redirects to /login', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
