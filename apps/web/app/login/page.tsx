'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, CardHeader, Input } from '@heroui/react';
import { login } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { loginSchema } from './schemas';

export default function LoginPage() {
  const { login: setToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const { access_token } = await login(result.data.email, result.data.password);
      setToken(access_token);
      router.push('/checkout');
    } catch {
      setApiError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-default-100">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-0 pt-6 px-6">
          <h1 className="text-2xl font-bold">Sign in</h1>
        </CardHeader>
        <CardBody className="px-6 pb-6 gap-4">
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
              type="password"
              variant="bordered"
              classNames={{ inputWrapper: 'border-default-400' }}
              value={password}
              onValueChange={setPassword}
              isInvalid={!!fieldErrors.password}
              errorMessage={fieldErrors.password}
              isRequired
            />
            <Button type="submit" color="primary" isLoading={loading} isDisabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
