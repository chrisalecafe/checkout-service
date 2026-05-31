import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { IAuthProvider } from '@ports/out/auth.provider.port';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject('IAuthProvider') private readonly auth: IAuthProvider) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const { userId } = await this.auth.verifyCredentials(dto.email, dto.password);
    return this.auth.issueToken(userId);
  }
}
