import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { Role } from '@prisma/client';
import { ValidationService } from 'src/common/validation.service';
import { CreatePaymentValidation } from 'src/booking/booking.validation';

@Controller('/api/payment')
export class PaymentController {
  constructor(private paymenService: PaymentService, private validationService: ValidationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async processPayment(
    @Body() body: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(CreatePaymentValidation, body)
    return this.paymenService.processPayment(data, user.id);
  }
}
