import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { IProcessCheckout } from '@ports/in/checkout.usecase.port';
import { CheckoutRequestDto } from './checkout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class CheckoutController {
  constructor(
    @Inject('IProcessCheckout') private readonly useCase: IProcessCheckout,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(@Body() dto: CheckoutRequestDto, @Req() req: any) {
    return this.useCase.execute(req.user.userId, dto.items);
  }
}
