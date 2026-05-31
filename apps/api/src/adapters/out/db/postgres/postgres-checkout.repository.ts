import { Injectable } from '@nestjs/common';
import { CheckoutSession } from '@domain/checkout';
import { ICheckoutRepository } from '@ports/out/checkout.repo.port';
import { PrismaService } from '@adapters/out/db/prisma/prisma.service';

@Injectable()
export class PostgresCheckoutRepository implements ICheckoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: Omit<CheckoutSession, 'id' | 'created_at'>): Promise<CheckoutSession> {
    const saved = await this.prisma.checkoutSession.create({
      data: {
        user_id: session.user_id,
        items: session.items as object[],
        subtotal: session.subtotal,
        taxes: session.taxes,
        discount: session.discount,
        total: session.total,
      },
    });
    return {
      id: saved.id,
      user_id: saved.user_id,
      items: saved.items as CheckoutSession['items'],
      subtotal: Number(saved.subtotal),
      taxes: Number(saved.taxes),
      discount: Number(saved.discount),
      total: Number(saved.total),
      created_at: saved.created_at,
    };
  }
}
