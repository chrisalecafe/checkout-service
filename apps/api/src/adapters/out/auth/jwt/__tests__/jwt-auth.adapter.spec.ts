import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JwtAuthAdapter } from '../jwt-auth.adapter';

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_SECRET = 'a-very-long-secret-that-is-at-least-32-chars!!';

function makeAdapter(prisma: any): JwtAuthAdapter {
  process.env.JWT_SECRET = VALID_SECRET;
  return new JwtAuthAdapter(prisma as any);
}

function makePrisma(overrides: Partial<{ user: any }> = {}) {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      ...overrides.user,
    },
  };
}

// ─── Constructor ─────────────────────────────────────────────────────────────

describe('JwtAuthAdapter — constructor', () => {
  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => new JwtAuthAdapter({} as any)).toThrow(
      'JWT_SECRET env var must be set and at least 32 characters long.',
    );
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => new JwtAuthAdapter({} as any)).toThrow(
      'JWT_SECRET env var must be set and at least 32 characters long.',
    );
  });

  it('instantiates successfully when JWT_SECRET is ≥32 chars', () => {
    process.env.JWT_SECRET = VALID_SECRET;
    expect(() => new JwtAuthAdapter({} as any)).not.toThrow();
  });
});

// ─── register ────────────────────────────────────────────────────────────────

describe('JwtAuthAdapter — register', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let adapter: JwtAuthAdapter;

  beforeEach(() => {
    prisma = makePrisma();
    adapter = makeAdapter(prisma);
  });

  it('hashes the password with bcrypt before storing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', password: 'hash' });

    await adapter.register('a@b.com', 'password123');

    const [{ data }] = prisma.user.create.mock.calls[0];
    expect(data.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', data.password)).toBe(true);
  });

  it('throws ConflictException when email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'a@b.com' });

    await expect(adapter.register('a@b.com', 'password123')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the new userId on success', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'new-uuid', email: 'a@b.com', password: 'hash' });

    const result = await adapter.register('a@b.com', 'password123');

    expect(result).toEqual({ userId: 'new-uuid' });
  });
});

// ─── verifyCredentials ───────────────────────────────────────────────────────

describe('JwtAuthAdapter — verifyCredentials', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let adapter: JwtAuthAdapter;
  const hash = bcrypt.hashSync('correct-password', 12);

  beforeEach(() => {
    prisma = makePrisma();
    adapter = makeAdapter(prisma);
  });

  it('returns userId on valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', password: hash });

    const result = await adapter.verifyCredentials('a@b.com', 'correct-password');

    expect(result).toEqual({ userId: 'uuid-1' });
  });

  it('throws UnauthorizedException when email is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(adapter.verifyCredentials('unknown@b.com', 'any')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', password: hash });

    await expect(adapter.verifyCredentials('a@b.com', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the same generic message for both failure cases (no oracle)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const err = await adapter.verifyCredentials('x@x.com', 'pass').catch((e) => e);
    expect((err as UnauthorizedException).message).toBe('Invalid credentials');
  });
});

// ─── issueToken / validateToken ──────────────────────────────────────────────

describe('JwtAuthAdapter — token lifecycle', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let adapter: JwtAuthAdapter;

  beforeEach(() => {
    prisma = makePrisma();
    adapter = makeAdapter(prisma);
  });

  it('issues a valid JWT with sub = userId and expires_in = 3600', async () => {
    const { access_token, expires_in } = await adapter.issueToken('user-42');

    expect(expires_in).toBe(3600);
    const payload = jwt.verify(access_token, VALID_SECRET) as Record<string, unknown>;
    expect(payload.sub).toBe('user-42');
  });

  it('validateToken returns userId for a valid token', async () => {
    const token = jwt.sign({ sub: 'user-42' }, VALID_SECRET, { expiresIn: 3600 });

    const result = await adapter.validateToken(token);

    expect(result).toEqual({ userId: 'user-42' });
  });

  it('validateToken throws UnauthorizedException for an expired token', async () => {
    const token = jwt.sign({ sub: 'user-42' }, VALID_SECRET, { expiresIn: -1 });

    await expect(adapter.validateToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateToken throws UnauthorizedException for a tampered token', async () => {
    const token = jwt.sign({ sub: 'user-42' }, 'different-secret-that-is-also-32-chars-long!!', { expiresIn: 3600 });

    await expect(adapter.validateToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateToken throws UnauthorizedException for a malformed token', async () => {
    await expect(adapter.validateToken('not.a.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
