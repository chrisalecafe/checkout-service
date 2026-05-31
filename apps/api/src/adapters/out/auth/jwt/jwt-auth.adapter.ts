import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { IAuthProvider } from '@ports/out/auth.provider.port';
import { PrismaService } from '@adapters/out/db/prisma/prisma.service';

const BCRYPT_COST = 12;

@Injectable()
export class JwtAuthAdapter implements IAuthProvider {
  private readonly secret = process.env.JWT_SECRET ?? 'change-me';

  constructor(private readonly prisma: PrismaService) {}

  async register(email: string, password: string): Promise<{ userId: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const saved = await this.prisma.user.create({ data: { email, password: hash } });
    return { userId: saved.id };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
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
