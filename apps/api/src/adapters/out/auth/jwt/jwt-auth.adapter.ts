import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IAuthProvider } from '@ports/out/auth.provider.port';

const BCRYPT_COST = 12;

@Injectable()
export class JwtAuthAdapter implements IAuthProvider {
  private readonly secret: string;
  private readonly logger = new Logger(JwtAuthAdapter.name);
  private readonly users = new Map<string, { id: string; email: string; passwordHash: string }>();

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET env var must be set and at least 32 characters long.');
    }
    this.secret = secret;
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    for (const u of this.users.values()) {
      if (u.email === email) throw new ConflictException('Email already registered');
    }
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    this.users.set(userId, { id: userId, email, passwordHash });
    this.logger.log(`User registered: ${userId}`);
    return { userId };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    let found: { id: string; email: string; passwordHash: string } | undefined;
    for (const u of this.users.values()) {
      if (u.email === email) { found = u; break; }
    }
    if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
      this.logger.warn('Failed login attempt');
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Successful login for user: ${found.id}`);
    return { userId: found.id };
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
