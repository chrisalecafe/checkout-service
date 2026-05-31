import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@adapters/out/db/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  @Get()
  async health() {
    if (!this.prisma) {
      return { status: 'ok', timestamp: new Date().toISOString(), provider: 'mock' };
    }
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Database connection failed');
    }
  }
}
