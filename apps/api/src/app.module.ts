import { Module } from '@nestjs/common';
import { CheckoutModule } from './checkout.module';
import { SeedService } from './adapters/out/db/seed/seed.service';
import { PrismaService } from './adapters/out/db/prisma/prisma.service';

const useMockDb = (process.env.DB_PROVIDER ?? 'postgres') === 'mock';

@Module({
  imports: [CheckoutModule],
  providers: [
    ...(useMockDb ? [] : [PrismaService, SeedService]),
  ],
})
export class AppModule {}
