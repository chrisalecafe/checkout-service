import { ConflictException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { IAuthProvider } from '@ports/out/auth.provider.port';
import { PrismaService } from '@adapters/out/db/prisma/prisma.service';

const BCRYPT_COST = 12;

/** Minimal shape of the Prisma user delegate needed by this adapter. */
interface UserRecord { id: string; email: string; password: string; }
interface PrismaUserClient {
  user: {
    findUnique(args: { where: { email: string } }): Promise<UserRecord | null>;
    create(args: { data: { id: string; email: string; password: string } }): Promise<UserRecord>;
  };
}

@Injectable()
export class JwtAuthAdapter implements IAuthProvider {
  private readonly secret: string;
  private readonly logger = new Logger(JwtAuthAdapter.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaUserClient) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET env var must be set and at least 32 characters long.');
    }
    this.secret = secret;
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const created = await this.prisma.user.create({
      data: { id, email, password: passwordHash },
    });
    this.logger.log(`User registered: ${created.id}`);
    return { userId: created.id };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn('Failed login attempt');
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Successful login for user: ${user.id}`);
    return { userId: user.id };
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
