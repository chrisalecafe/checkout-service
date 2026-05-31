import { Module } from '@nestjs/common';
import { ICheckoutRepository } from './core/ports/out/checkout.repo.port';
import { ProcessCheckoutUseCase } from './core/application/process-checkout.usecase';
import { PostgresCheckoutRepository } from './adapters/out/db/postgres/postgres-checkout.repository';
import { MockCheckoutRepository } from './adapters/out/db/mock/mock-checkout.repository';
import { JwtAuthAdapter } from './adapters/out/auth/jwt/jwt-auth.adapter';
import { MockAuthAdapter } from './adapters/out/auth/mock/mock-auth.adapter';
import { AuthController } from './adapters/in/http/auth/auth.controller';
import { CheckoutController } from './adapters/in/http/checkout/checkout.controller';
import { HealthController } from './adapters/in/http/health/health.controller';
import { JwtAuthGuard } from './adapters/in/http/auth/jwt-auth.guard';
import { PrismaService } from './adapters/out/db/prisma/prisma.service';

const DB_ADAPTER_MAP: Record<string, any> = {
  postgres: PostgresCheckoutRepository,
  mock: MockCheckoutRepository,
};

const AUTH_ADAPTER_MAP: Record<string, any> = {
  jwt: JwtAuthAdapter,
  mock: MockAuthAdapter,
};

const dbProvider = process.env.DB_PROVIDER ?? 'postgres';
const authProvider = process.env.AUTH_PROVIDER ?? 'jwt';
const DB_ADAPTER = DB_ADAPTER_MAP[dbProvider];
const AUTH_ADAPTER = AUTH_ADAPTER_MAP[authProvider];
const useMock = dbProvider === 'mock';

@Module({
  controllers: [AuthController, CheckoutController, HealthController],
  providers: [
    ...(useMock ? [] : [PrismaService]),
    { provide: 'ICheckoutRepository', useClass: DB_ADAPTER },
    { provide: 'IAuthProvider', useClass: AUTH_ADAPTER },
    {
      provide: 'IProcessCheckout',
      useFactory: (repo: ICheckoutRepository) => new ProcessCheckoutUseCase(repo),
      inject: ['ICheckoutRepository'],
    },
    JwtAuthGuard,
  ],
})
export class CheckoutModule {}
