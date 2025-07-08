import {
  Body,
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
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
  constructor(
    private paymentService: PaymentService,
    private validationService: ValidationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async processPayment(@Body() data: any, @CurrentUser() user: any) {
    return this.paymentService.processPayment(data, user.sub);
  }

  @Post('/callback')
  @HttpCode(HttpStatus.OK)
  async handlePaymentCallback(@Body() callbackData: any) {
    console.log('Payment callback received:', callbackData);

    await this.paymentService.handlePaymentCallback(callbackData);

    return {
      status: 'success',
      message: 'Callback processed successfully',
    };
  }

  // Webhook endpoint alternatif jika diperlukan
  // @Post('/webhook')
  // @HttpCode(HttpStatus.OK)
  // async handlePaymentWebhook(@Body() callbackData: any) {
  //   console.log('Payment webhook received:', callbackData);
  //
  //   await this.paymentService.handlePaymentCallback(callbackData);
  //
  //   return {
  //     status: 'success',
  //     message: 'Webhook processed successfully'
  //   };
  // }

  // Get payment history untuk user
  @Get('/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async getPaymentHistory(@CurrentUser() user: { id: number; role: Role }) {
    return this.paymentService.getPaymentHistory(user.id);
  }

  // Get payment details by ID
  @Get('/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async getPaymentDetails(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.paymentService.getPaymentDetails(paymentId, user.id);
  }

  // Endpoint untuk retry payment (jika diperlukan)
  @Post('/retry/:bookingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async retryPayment(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {

    return this.paymentService.processPayment(data, user.sub) 
  }

  // Admin endpoints (optional)

  // @Roles('admin')
  // async getAllPayments() {
  //   // Implement admin method in service if needed
  //   return { message: 'Admin payment list endpoint' };
  // }

  // @Get('/admin/booking/:bookingId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'agent')
  // async getPaymentsByBooking(
  //   @Param('bookingId', ParseIntPipe) bookingId: number,
  // ) {
  //   // Implement admin method in service if needed
  //   return { message: `Admin payment details for booking ${bookingId}` };
  // }
}
