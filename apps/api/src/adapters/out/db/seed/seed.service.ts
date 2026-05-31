import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// password: password123
const HASHED_PW = '$2b$10$j4RF8wliG28Fm7rnbU9ag.B1l3MpZ7uazhwAlbemALrViqHFzc7IO';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;

    await this.prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com', password: HASHED_PW },
    });
    await this.prisma.user.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000002', email: 'alice@example.com', password: HASHED_PW },
    });

    await this.prisma.checkoutSession.upsert({
      where: { id: '10000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000001',
        items: [{ name: 'Widget', unit_price: 50.0, quantity: 2 }],
        subtotal: 100.0, taxes: 13.0, discount: 0.0, total: 113.0,
      },
    });
    await this.prisma.checkoutSession.upsert({
      where: { id: '10000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000001',
        items: [{ name: 'Gadget', unit_price: 75.0, quantity: 2 }],
        subtotal: 150.0, taxes: 19.5, discount: 15.0, total: 154.5,
      },
    });
    await this.prisma.checkoutSession.upsert({
      where: { id: '10000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '10000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000002',
        items: [{ name: 'Doohickey', unit_price: 25.0, quantity: 1 }, { name: 'Thingamajig', unit_price: 10.0, quantity: 3 }],
        subtotal: 55.0, taxes: 7.15, discount: 0.0, total: 62.15,
      },
    });

    this.logger.log('Dev seed data loaded (dev@example.com / alice@example.com, password: password123)');
  }
}
