import {
  BadRequestException,
  Body,
  Controller,
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
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { BookingStatus, Role } from '@prisma/client';
import {
  BookingQueryValidation,
  CreateBookingValidation,
} from './booking.validation';

@Controller('/api/booking')
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private validationService: ValidationService,
  ) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async createBooking(
    @Body() body: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(CreateBookingValidation, body);
    return this.bookingService.createBooking(data, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'agent', 'admin')
  async getBookings(
    @Query() query: any,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    const data = this.validationService.validate(BookingQueryValidation, query);
    return this.bookingService.getBookings(data, user.id, user.role);
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

    return this.bookingService.updateBookingStatus(
      id,
      status as BookingStatus,
      user.id,
      user.role,
    );
  }

  @Post('reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  async requestReschedule(@Body() body: any, @CurrentUser() user: { id: number, role: Role }) {
    // const data = this.validationService.validate(RescheduleSchema, body);
    return this.bookingService.requestReschedule(body, user.id);
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
}
