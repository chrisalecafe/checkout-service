import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CheckoutModule } from './checkout.module';
import { SeedService } from './adapters/out/db/seed/seed.service';
import { PrismaService } from './adapters/out/db/prisma/prisma.service';

const useMockDb = (process.env.DB_PROVIDER ?? 'postgres') === 'mock';

@Module({
  imports: [
    CheckoutModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },   // 60 req/min general
      { name: 'auth',    ttl: 60_000, limit: 10 },    // 10 req/min on auth routes
    ]),
  ],
  providers: [
    ...(useMockDb ? [] : [PrismaService, SeedService]),
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
