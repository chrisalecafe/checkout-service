import { Injectable, NotImplementedException } from '@nestjs/common';
import { IAuthProvider } from '@ports/out/auth.provider.port';

@Injectable()
export class Auth0AuthAdapter implements IAuthProvider {
  async register(_email: string, _password: string): Promise<{ userId: string }> {
    throw new NotImplementedException('Auth0 adapter not configured');
  }
  async verifyCredentials(_email: string, _password: string): Promise<{ userId: string }> {
    throw new NotImplementedException('Auth0 adapter not configured');
  }
  async issueToken(_userId: string): Promise<{ access_token: string; expires_in: number }> {
    throw new NotImplementedException('Auth0 adapter not configured');
  }
  async validateToken(_token: string): Promise<{ userId: string }> {
    throw new NotImplementedException('Auth0 adapter not configured');
  }
}
