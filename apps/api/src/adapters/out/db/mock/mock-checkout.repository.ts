import { Injectable } from '@nestjs/common';
import { CheckoutSession } from '@domain/checkout';
import { ICheckoutRepository } from '@ports/out/checkout.repo.port';

@Injectable()
export class MockCheckoutRepository implements ICheckoutRepository {
  private readonly sessions: CheckoutSession[] = [];

  async save(session: Omit<CheckoutSession, 'id' | 'created_at'>): Promise<CheckoutSession> {
    const mockSession: CheckoutSession = {
      id: `mock-session-${Math.random().toString(36).substring(2, 11)}`,
      user_id: session.user_id,
      items: session.items,
      subtotal: session.subtotal,
      taxes: session.taxes,
      discount: session.discount,
      total: session.total,
      created_at: new Date(),
    };
    
    this.sessions.push(mockSession);
    return mockSession;
  }

  // Helper method for testing or viewing stored sessions
  getSessions(): CheckoutSession[] {
    return this.sessions;
  }
}
