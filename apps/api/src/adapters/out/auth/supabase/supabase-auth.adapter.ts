import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthProvider } from '@ports/out/auth.provider.port';
import ws from 'ws';

// Polyfill WebSocket for Node.js < 22 to satisfy Supabase's Realtime client requirements
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = ws;
}

@Injectable()
export class SupabaseAuthAdapter implements IAuthProvider {
  private readonly client: SupabaseClient;
  private readonly logger = new Logger(SupabaseAuthAdapter.name);

  // Bridges the verifyCredentials → issueToken call pair.
  // Supabase returns user + token together from signInWithPassword; we cache
  // the token here keyed by userId and drain it in issueToken.
  private readonly sessionCache = new Map<string, string>();

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    const { data, error } = await this.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      this.logger.error(`Register failed: ${error.message}`);
      throw new Error(error.message);
    }

    this.logger.log(`User registered: ${data.user.id}`);
    return { userId: data.user.id };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string }> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.sessionCache.set(data.user.id, data.session.access_token);
    this.logger.log(`Successful login for user: ${data.user.id}`);
    return { userId: data.user.id };
  }

  async issueToken(userId: string): Promise<{ access_token: string; expires_in: number }> {
    const cached = this.sessionCache.get(userId);
    if (cached) {
      this.sessionCache.delete(userId);
      return { access_token: cached, expires_in: 3600 };
    }

    // Refresh path: sign a short-lived token locally using the Supabase JWT secret.
    const { data, error } = await this.client.auth.admin.getUserById(userId);
    if (error || !data.user) throw new UnauthorizedException();

    // Re-sign by generating a new session via admin API
    if (!data.user.email) throw new UnauthorizedException();
    const { data: sessionData, error: sessionError } =
      await this.client.auth.admin.generateLink({ type: 'magiclink', email: data.user.email });
    if (sessionError) throw new UnauthorizedException();

    return { access_token: sessionData.properties.hashed_token, expires_in: 3600 };
  }

  async validateToken(token: string): Promise<{ userId: string }> {
    const { data: { user }, error } = await this.client.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException();
    return { userId: user.id };
  }
}
