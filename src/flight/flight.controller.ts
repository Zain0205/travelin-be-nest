import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FlightService } from './flight.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CreateFlight } from 'src/model/flight.model';
import { Role } from '@prisma/client';
import { FileFieldsUploadInterceptor } from 'src/common/file-upload.interceptor';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { Pagination } from 'src/model/travel-package.model';

@Controller('/api/flight')
export class FlightController {
  constructor(private flightService: FlightService) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  @UseInterceptors(
    FileFieldsUploadInterceptor([{ name: 'thumbnail', maxCount: 1 }]),
  )
  async create(
    @CurrentUser() user: { id: number; role: Role },
    @Body() request: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
    },
  ) {
    const thumbnail = files.thumbnail?.[0];
    const thumbnailUrl = thumbnail ? `uploads/${thumbnail.filename}` : null;

    const flightData: CreateFlight = {
      ...request,
      thumnail: thumbnailUrl,
      price: parseFloat(request.price),
      departureTime: new Date(request.departureTime),
      arrivalTime: new Date(request.arrivalTime),
    };

    return this.flightService.createFlight(user.id, flightData);
  }

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('airlineName') airlineName?: string,
    @Query('origin') origin?: string,
    @Query('destination') destination?: string,
  ) {
    const pagination: Pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const filters = {
      airlineName,
      origin,
      destination,
    };

    return this.flightService.getAllFlights(pagination, filters);
  }

  @Get('/:id')
  async getFlightById(@Param('id', ParseIntPipe) id: number) {
    return this.flightService.getFlightById(id);
  }

  @Patch('/update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.agent, Role.admin)
  @UseInterceptors(
    FileFieldsUploadInterceptor([{ name: 'thumbnail', maxCount: 1 }]),
  )
  async update(
    @CurrentUser() user: { id: number; role: Role },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFlightDto: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
    },
  ) {
    const thumbnail = files.thumbnail?.[0];
    const thumbnailUrl = thumbnail
      ? `uploads/${thumbnail.filename}`
      : undefined;

    const updateData = {
      ...updateFlightDto,
      ...(thumbnailUrl && { thumnail: thumbnailUrl }),
      ...(updateFlightDto.price && {
        price: parseFloat(updateFlightDto.price),
      }),
      ...(updateFlightDto.departureTime && {
        departureTime: new Date(updateFlightDto.departureTime),
      }),
      ...(updateFlightDto.arrivalTime && {
        arrivalTime: new Date(updateFlightDto.arrivalTime),
      }),
    };

    return this.flightService.updateFlight(id, user.id, updateData);
  }

  @Delete('/delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  async delete(
    @CurrentUser() user: { id: number; role: Role },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const agentId = user.id;
    return this.flightService.deleteFlight(id, agentId);
  }
}
