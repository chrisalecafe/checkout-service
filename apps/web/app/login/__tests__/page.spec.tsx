import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

// --- mocks ---
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockSetToken = jest.fn();
jest.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({ login: mockSetToken }),
}));

jest.mock('../../../lib/api', () => ({
  login: jest.fn(),
}));
import { login as mockLogin } from '../../../lib/api';

// --- helpers ---
function setup() {
  const user = userEvent.setup();
  render(<LoginPage />);
  return {
    user,
    email: () => screen.getByLabelText(/email/i),
    password: () => screen.getByLabelText('Password'),
    submit: () => screen.getByRole('button', { name: /sign in/i }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── rendering ──────────────────────────────────────────────────────────────
describe('LoginPage — rendering', () => {
  it('shows the logo and heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /simple checkout/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    const { email, password } = setup();
    expect(email()).toBeInTheDocument();
    expect(password()).toBeInTheDocument();
  });

  it('renders the sign in button', () => {
    const { submit } = setup();
    expect(submit()).toBeInTheDocument();
  });
});

// ── validation (Zod) ────────────────────────────────────────────────────────
describe('LoginPage — Zod validation', () => {
  it('shows email error when email is invalid', async () => {
    const { user, email, submit } = setup();
    await user.type(email(), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(submit());
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows password error when password is too short', async () => {
    const { user, email, submit } = setup();
    await user.type(email(), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(submit());
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// ── success flow ────────────────────────────────────────────────────────────
describe('LoginPage — success', () => {
  it('calls login API with credentials and redirects to /checkout', async () => {
    (mockLogin as jest.Mock).mockResolvedValue({ access_token: 'tok123', expires_in: 3600 });
    const { user, email, submit } = setup();
    await user.type(email(), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(submit());
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123'));
    expect(mockSetToken).toHaveBeenCalledWith('tok123', 3600);
    expect(mockPush).toHaveBeenCalledWith('/checkout');
  });
});

// ── error flow ──────────────────────────────────────────────────────────────
describe('LoginPage — API error', () => {
  it('shows invalid credentials error when API rejects', async () => {
    (mockLogin as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));
    const { user, email, submit } = setup();
    await user.type(email(), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(submit());
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ── password visibility toggle ──────────────────────────────────────────────
describe('LoginPage — password toggle', () => {
  it('toggles password visibility when the eye button is clicked', async () => {
    const { user } = setup();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

// ── loading state ───────────────────────────────────────────────────────────
describe('LoginPage — loading state', () => {
  it('disables the sign in button while the request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    (mockLogin as jest.Mock).mockReturnValue(new Promise(r => (resolve = r)));
    const { user, email, submit } = setup();
    await user.type(email(), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(submit());
    expect(submit()).toBeDisabled();
    resolve({ access_token: 'tok', expires_in: 3600 });
  });
});
