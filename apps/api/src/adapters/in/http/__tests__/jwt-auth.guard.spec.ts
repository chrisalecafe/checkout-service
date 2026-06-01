import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(authHeader: string | undefined): ExecutionContext {
  const req: Record<string, unknown> = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeAuthProvider(result: 'resolve' | 'reject', value?: { userId: string }) {
  return {
    validateToken: jest.fn().mockImplementation(() =>
      result === 'resolve'
        ? Promise.resolve(value ?? { userId: 'user-1' })
        : Promise.reject(new UnauthorizedException()),
    ),
  };
}

// ─── JwtAuthGuard ────────────────────────────────────────────────────────────

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(makeAuthProvider('resolve') as any);
  });

  // Missing token cases

  it('throws UnauthorizedException when Authorization header is absent', async () => {
    const ctx = makeContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when Authorization header is empty', async () => {
    const ctx = makeContext('');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not start with "Bearer "', async () => {
    const ctx = makeContext('Basic dXNlcjpwYXNz');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when Bearer token is empty string', async () => {
    const ctx = makeContext('Bearer ');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // Invalid / expired / tampered token cases

  it('throws UnauthorizedException when validateToken rejects (expired token)', async () => {
    const auth = makeAuthProvider('reject');
    guard = new JwtAuthGuard(auth as any);
    const ctx = makeContext('Bearer expired.jwt.token');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.validateToken).toHaveBeenCalledWith('expired.jwt.token');
  });

  it('throws UnauthorizedException when validateToken rejects (tampered token)', async () => {
    const auth = makeAuthProvider('reject');
    guard = new JwtAuthGuard(auth as any);
    const ctx = makeContext('Bearer tampered.jwt.token');

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // Valid token cases

  it('returns true and attaches user to request for a valid token', async () => {
    const auth = makeAuthProvider('resolve', { userId: 'user-42' });
    guard = new JwtAuthGuard(auth as any);
    const ctx = makeContext('Bearer valid.jwt.token');
    const req = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual({ userId: 'user-42' });
    expect(auth.validateToken).toHaveBeenCalledWith('valid.jwt.token');
  });

  it('correctly strips the "Bearer " prefix before passing token to validateToken', async () => {
    const auth = makeAuthProvider('resolve', { userId: 'u1' });
    guard = new JwtAuthGuard(auth as any);
    const ctx = makeContext('Bearer my-actual-token');

    await guard.canActivate(ctx);

    expect(auth.validateToken).toHaveBeenCalledWith('my-actual-token');
    expect(auth.validateToken).not.toHaveBeenCalledWith('Bearer my-actual-token');
  });
});
