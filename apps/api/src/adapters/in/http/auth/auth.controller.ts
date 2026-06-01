import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IAuthProvider } from '@ports/out/auth.provider.port';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RegisterDto, TokenResponseDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
@Throttle({ auth: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(@Inject('IAuthProvider') private readonly auth: IAuthProvider) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive a JWT' })
  @ApiResponse({ status: 200, description: 'JWT issued', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const { userId } = await this.auth.verifyCredentials(dto.email, dto.password);
    return this.auth.issueToken(userId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh an access token without re-entering credentials' })
  @ApiResponse({ status: 200, description: 'New JWT issued', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Token invalid or expired' })
  async refresh(@Req() req: any) {
    return this.auth.issueToken(req.user.userId);
  }
}
