import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { ValidationService } from 'src/common/validation.service';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { BookingStatus, Role } from '@prisma/client';
import {
  BookingQueryValidation,
  CreateBookingValidation,
} from './booking.validation';
import { CancelBookingValidation, ProcessRefundValidation, RefundQueryValidation, RefundValidation } from './refund.validation';
import { BookingInput } from 'src/model/booking.model';

@Controller('/api/booking')
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private validationService: ValidationService,
    private refundService: RefundService,
  ) { }

  @Post('/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', "agent")
  async createBooking(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {

    let bookingData: any;
    console.log(data)
    console.log("Controller")

    switch (data.type) {
      case "package":
        if (typeof data.packages[0].packageId !== 'number') {
          throw new BadRequestException('packageId is required for package bookings');
        }

        bookingData = {
          userId: user.sub,
          travelDate: new Date(data.packages[0].travelDate),
          type: 'package',
          packageId: data.packages[0].packageId,
        };
        break;

      case 'hotel':
        bookingData = {
          userId: user.sub,
          type: 'hotel',
          travelDate: data.checkInDate,
          hotels: (data.hotels ?? []).map((item: any) => ({
            hotelId: item.hotelId,
            checkInDate: new Date(item.checkInDate),
            checkOutDate: new Date(item.checkOutDate),
            nights: item.nights,
          })),
        };
        break;

      case 'flight':
        bookingData = {
          userId: user.sub,
          travelDate: new Date(data.travelDate),
          type: 'flight',
          flights: data.flightBookings ?? [],
        };
        break;

      case 'custom':
        bookingData = {
          userId: user.id,
          travelDate: new Date(data.travelDate),
          type: 'custom',
          hotels: (data.hotelBookings ?? []).map((item) => ({
            hotelId: item.hotelId,
            checkInDate: new Date(item.checkInDate),
            checkOutDate: new Date(item.checkOutDate),
            nights: item.nights,
          })),
          flights: data.flightBookings ?? [],
        };
        break;

      default:
        throw new BadRequestException('Invalid booking type');
    }

    return this.bookingService.createBooking(bookingData, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async getBookings(
    @Query() data: any,
    @CurrentUser() user: any,
  ) {
    if (user.role === 'customer') {
      data.userId = user.sub as any;
    }

    const userId = user.role === 'admin' ? undefined : user.sub;

    return this.bookingService.getBookings(data, userId, user.role);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async getBookingById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.bookingService.getBookingById(id, user.id, user.role);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async updateBookingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
      throw new BadRequestException(`Invalid status value: ${status}`);
    }

    console.log(user)
    console.log(id)

    return this.bookingService.updateBookingStatus(
      id,
      status as BookingStatus,
      user.sub,
      user.role,
    );
  }

  @Post('reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async requestReschedule(@Body() body: any, @CurrentUser() user: any) {
    return this.bookingService.requestReschedule(body, user.sub);
  }

  @Put('reschedule/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('agent', 'admin')
  async approveReschedule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.bookingService.handleRescheduleRequest(
      id,
      true,
      user.id,
      user.role,
    );
  }

  @Put('reschedule/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('agent', 'admin')
  async rejectReschedule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.bookingService.handleRescheduleRequest(
      id,
      false,
      user.id,
      user.role,
    );
  }

  @Delete('/cancel/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async cancelBooking(
    @Param('id', ParseIntPipe) bookingId: number,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {

    return this.refundService.cancelBooking(data, user.sub, bookingId)
  }

  @Post('/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async requestRefund(
    @Body() body: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(RefundValidation, body);
    return this.refundService.requestRefund(data, user.id);
  }

  @Get('/refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async getRefunds(
    @Query() query: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(RefundQueryValidation as any, query) as any;
    return this.refundService.getRefunds(data, user.id, user.role);
  }

  @Get('/refund/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async getRefundById(
    @Param('id', ParseIntPipe) refundId: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.refundService.getRefundById(refundId, user.id, user.role);
  }

  @Put('/refund/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'agent')
  async processRefund(
    @Param('id', ParseIntPipe) refundId: number,
    @Body() body: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(ProcessRefundValidation, {
      ...body,
      refundId,
    });

    return this.refundService.processRefund(data, user.id);
  }
}
