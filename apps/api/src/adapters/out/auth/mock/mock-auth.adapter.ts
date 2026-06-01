import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IAuthProvider } from '@ports/out/auth.provider.port';

const BCRYPT_COST = 12;

// Bcrypt hash for 'password123' — used only in dev seed data, never in production.
const SEED_HASH = '$2b$10$j4RF8wliG28Fm7rnbU9ag.B1l3MpZ7uazhwAlbemALrViqHFzc7IO';

@Injectable()
export class MockAuthAdapter implements IAuthProvider {
  private readonly secret: string;
  private readonly logger = new Logger(MockAuthAdapter.name);
  private readonly users: Map<string, { id: string; email: string; passwordHash: string }> = new Map([
    ['00000000-0000-0000-0000-000000000001', { id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com',   passwordHash: SEED_HASH }],
    ['00000000-0000-0000-0000-000000000002', { id: '00000000-0000-0000-0000-000000000002', email: 'alice@example.com', passwordHash: SEED_HASH }],
  ]);

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET env var must be set and at least 32 characters long.');
    }
    this.secret = secret;
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        throw new ConflictException('Email already registered');
      }
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    this.users.set(userId, { id: userId, email, passwordHash });
    this.logger.log(`Mock user registered: ${userId}`);
    return { userId };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    let foundUser: { id: string; email: string; passwordHash: string } | undefined;

    for (const user of this.users.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      this.logger.warn('Failed mock login attempt — email not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      this.logger.warn(`Failed mock login attempt — wrong password for user: ${foundUser.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Successful mock login for user: ${foundUser.id}`);
    return { userId: foundUser.id };
  }

  async issueToken(userId: string): Promise<{ access_token: string; expires_in: number }> {
    const expires_in = 3600;
    const access_token = jwt.sign({ sub: userId }, this.secret, { expiresIn: expires_in });
    return { access_token, expires_in };
  }

  async validateToken(token: string): Promise<{ userId: string }> {
    try {
      const payload = jwt.verify(token, this.secret) as { sub: string };
      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
