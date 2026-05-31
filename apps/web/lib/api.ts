import { CheckoutItem, CheckoutResult } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function login(email: string, password: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json();
}

export async function checkout(token: string, items: CheckoutItem[]): Promise<CheckoutResult> {
  const res = await fetch(`${BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json();
}
