import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IProcessCheckout } from '@ports/in/checkout.usecase.port';
import { IGetCheckoutHistory } from '@ports/in/checkout-history.usecase.port';
import { CheckoutRequestDto, CheckoutResponseDto } from './checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('checkout')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CheckoutController {
  constructor(
    @Inject('IProcessCheckout') private readonly useCase: IProcessCheckout,
    @Inject('IGetCheckoutHistory') private readonly historyUseCase: IGetCheckoutHistory,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Process a checkout', description: 'Accepts a list of items, returns subtotal, taxes, discount, and total.' })
  @ApiResponse({ status: 201, description: 'Checkout result', type: CheckoutResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkout(@Body() dto: CheckoutRequestDto, @Req() req: any) {
    return this.useCase.execute(req.user.userId, dto.items);
  }

  @Get('checkout/history')
  @ApiOperation({ summary: 'Retrieve checkout history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of past checkout sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async history(@Req() req: any) {
    return this.historyUseCase.execute(req.user.userId);
  }
}
