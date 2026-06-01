import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ICheckoutRepository } from './core/ports/out/checkout.repo.port';
import { IPricingConfigProvider } from './core/ports/out/pricing-config.provider.port';
import { ProcessCheckoutUseCase } from './core/application/process-checkout.usecase';
import { GetCheckoutHistoryUseCase } from './core/application/get-checkout-history.usecase';
import { PostgresCheckoutRepository } from './adapters/out/db/postgres/postgres-checkout.repository';
import { MockCheckoutRepository } from './adapters/out/db/mock/mock-checkout.repository';
import { EnvPricingConfigProvider } from './adapters/out/pricing/env-pricing-config.provider';
import { JwtAuthAdapter } from './adapters/out/auth/jwt/jwt-auth.adapter';
import { MockAuthAdapter } from './adapters/out/auth/mock/mock-auth.adapter';
import { SupabaseAuthAdapter } from './adapters/out/auth/supabase/supabase-auth.adapter';
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
  supabase: SupabaseAuthAdapter,
};

const dbProvider = process.env.DB_PROVIDER ?? 'postgres';
const authProvider = process.env.AUTH_PROVIDER ?? 'jwt';
const DB_ADAPTER = DB_ADAPTER_MAP[dbProvider];
const AUTH_ADAPTER = AUTH_ADAPTER_MAP[authProvider];
const useMock = dbProvider === 'mock';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // Global default: 60 requests per minute per IP
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
      {
        // Strict throttle for auth endpoints: 10 requests per minute per IP
        name: 'auth',
        ttl: 60_000,
        limit: 10,
      },
    ]),
  ],
  controllers: [AuthController, CheckoutController, HealthController],
  providers: [
    // Apply rate limiting globally; individual endpoints can override with @Throttle()
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    ...(useMock ? [] : [PrismaService]),
    { provide: 'ICheckoutRepository', useClass: DB_ADAPTER },
    { provide: 'IAuthProvider', useClass: AUTH_ADAPTER },
    { provide: 'IPricingConfigProvider', useClass: EnvPricingConfigProvider },
    {
      provide: 'IProcessCheckout',
      useFactory: (repo: ICheckoutRepository, pricing: IPricingConfigProvider) =>
        new ProcessCheckoutUseCase(repo, pricing),
      inject: ['ICheckoutRepository', 'IPricingConfigProvider'],
    },
    {
      provide: 'IGetCheckoutHistory',
      useFactory: (repo: ICheckoutRepository) => new GetCheckoutHistoryUseCase(repo),
      inject: ['ICheckoutRepository'],
    },
    JwtAuthGuard,
  ],
})
export class CheckoutModule {}
