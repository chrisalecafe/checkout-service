import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { IAuthProvider } from '@ports/out/auth.provider.port';

const BCRYPT_COST = 12;

// password: password123
const SEED_HASH = '$2b$10$j4RF8wliG28Fm7rnbU9ag.B1l3MpZ7uazhwAlbemALrViqHFzc7IO';

@Injectable()
export class MockAuthAdapter implements IAuthProvider {
  private readonly secret = process.env.JWT_SECRET ?? 'mock-secret';
  private readonly users: Map<string, { id: string; email: string; passwordHash: string }> = new Map([
    ['00000000-0000-0000-0000-000000000001', { id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com',   passwordHash: SEED_HASH }],
    ['00000000-0000-0000-0000-000000000002', { id: '00000000-0000-0000-0000-000000000002', email: 'alice@example.com', passwordHash: SEED_HASH }],
  ]);

  async register(email: string, password: string): Promise<{ userId: string }> {
    // Check if user already exists
    for (const user of this.users.values()) {
      if (user.email === email) {
        throw new ConflictException('Email already registered');
      }
    }

    const userId = `mock-user-${Math.random().toString(36).substring(2, 11)}`;
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    
    this.users.set(userId, {
      id: userId,
      email,
      passwordHash,
    });

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
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
