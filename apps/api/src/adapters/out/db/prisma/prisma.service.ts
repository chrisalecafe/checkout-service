import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (process.env.DB_PROVIDER !== 'mock') {
      await this.$connect();
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
