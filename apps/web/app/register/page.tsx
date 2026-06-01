'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardBody, Input } from '@heroui/react';
import { register, login } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { registerSchema } from './schemas';
import { Logo } from '../components/Logo';

export default function RegisterPage() {
  const { login: setToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');

    const result = registerSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      const fieldErrs = result.error.flatten().fieldErrors;
      const formErrs = result.error.flatten().formErrors;
      setFieldErrors({
        email: fieldErrs.email?.[0],
        password: fieldErrs.password?.[0],
        confirmPassword: fieldErrs.confirmPassword?.[0] ?? formErrs?.[0],
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await register(result.data.email, result.data.password);
      const { access_token, expires_in } = await login(result.data.email, result.data.password);
      setToken(access_token, expires_in);
      router.push('/checkout');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setApiError(msg.toLowerCase().includes('already') ? 'Email already in use' : msg);
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
            <h1 className="text-xl font-semibold">Create an account</h1>
            <p className="text-sm text-default-500 mt-1">Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {apiError && <p className="text-danger text-sm">{apiError}</p>}
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
              type="password"
              variant="bordered"
              classNames={{ inputWrapper: 'border-default-400' }}
              value={password}
              onValueChange={setPassword}
              isInvalid={!!fieldErrors.password}
              errorMessage={fieldErrors.password}
              isRequired
            />
            <Input
              label="Confirm password"
              type="password"
              variant="bordered"
              classNames={{ inputWrapper: 'border-default-400' }}
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              isInvalid={!!fieldErrors.confirmPassword}
              errorMessage={fieldErrors.confirmPassword}
              isRequired
            />
            <Button type="submit" color="primary" isLoading={loading} isDisabled={loading} fullWidth>
              Create account
            </Button>
          </form>

          <p className="text-sm text-center text-default-500">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>

      <p className="text-xs text-default-400">Simple Checkout &copy; {new Date().getFullYear()}</p>
    </main>
  );
}
