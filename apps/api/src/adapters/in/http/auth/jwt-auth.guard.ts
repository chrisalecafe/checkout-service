import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { IAuthProvider } from '@ports/out/auth.provider.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject('IAuthProvider') private readonly auth: IAuthProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();
    req.user = await this.auth.validateToken(token);
    return true;
  }
}
