import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@adapters/out/db/prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy', schema: { example: { status: 'ok', timestamp: '2026-05-31T00:00:00.000Z' } } })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
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
