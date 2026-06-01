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
    return this.toEntity(saved);
  }

  async findByUser(userId: string): Promise<CheckoutSession[]> {
    const rows = await this.prisma.checkoutSession.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: any): CheckoutSession {
    return {
      id: row.id,
      user_id: row.user_id,
      items: row.items as CheckoutSession['items'],
      subtotal: Number(row.subtotal),
      taxes: Number(row.taxes),
      discount: Number(row.discount),
      total: Number(row.total),
      created_at: row.created_at,
    };
  }
}
