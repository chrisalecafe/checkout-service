'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardBody, Input } from '@heroui/react';
import { login } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { loginSchema } from './schemas';
import { Logo } from '../components/Logo';

export default function LoginPage() {
  const { login: setToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setFieldErrors({ email: errs.email?.[0], password: errs.password?.[0] });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { access_token, expires_in } = await login(result.data.email, result.data.password);
      setToken(access_token, expires_in);
      router.push('/checkout');
    } catch {
      setApiError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-default-100 px-4">
      <Logo size="lg" />

      <Card className="w-full max-w-sm shadow-md">
        <CardBody className="px-6 py-8 gap-6">
          <div>
            <h1 className="text-xl font-semibold">Welcome back</h1>

            <p className="text-sm text-default-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {apiError && (
              <p className="text-danger text-sm">{apiError}</p>
            )}
            <Input
              label="Email"
              type="email"
              variant="bordered"
              classNames={{ inputWrapper: 'border-default-400' }}
              value={email}
              onValueChange={setEmail}
              isInvalid={!!fieldErrors.email}
              errorMessage={fieldErrors.email}
              isRequired
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="bordered"
              classNames={{ inputWrapper: 'border-default-400' }}
              value={password}
              onValueChange={setPassword}
              isInvalid={!!fieldErrors.password}
              errorMessage={fieldErrors.password}
              isRequired
              endContent={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  className="text-default-400 hover:text-default-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />
            <Button type="submit" color="primary" isLoading={loading} isDisabled={loading} fullWidth>
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="text-sm text-default-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>

      <p className="text-xs text-default-400">Simple Checkout &copy; {new Date().getFullYear()}</p>
    </main>
  );
}
