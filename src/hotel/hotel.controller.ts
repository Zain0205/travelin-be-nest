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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { FileFieldsUploadInterceptor } from 'src/common/file-upload.interceptor';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { CreateHotel } from 'src/model/hotel.model';
import { Pagination } from 'src/model/travel-package.model';

@Controller('/api/hotel')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  @UseInterceptors(
    FileFieldsUploadInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'hotelImages', maxCount: 10 },
    ]),
  )
  async create(
    @CurrentUser() user: any,
    @Body() request: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      hotelImages?: Express.Multer.File[];
    },
  ) {
    const thumbnail = files.thumbnail?.[0];
    const hotelImages = files.hotelImages || [];

    const thumbnailUrl = thumbnail ? `uploads/${thumbnail.filename}` : null;

    const images = hotelImages.map((file) => ({
      fileUrl: `uploads/${file.filename}`,
      type: 'HOTEL_IMAGE',
    }));

    const hotelData: CreateHotel = {
      ...request,
      thumbnail: thumbnailUrl,
      images: images,
      pricePerNight: parseFloat(request.pricePerNight),
    };

    return this.hotelService.createHotel(user.sub, hotelData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllHotels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const pagination: Pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const filters = {
      name,
      location,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    return this.hotelService.getAllHotels(pagination, filters);
  }

  @Get('/:id')
  async getHotelById(@Param('id', ParseIntPipe) id: number) {
    return this.hotelService.getHotelById(id);
  }

  @Patch('/update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('agent', 'admin')
  @UseInterceptors(
    FileFieldsUploadInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'hotelImages', maxCount: 10 },
    ]),
  )
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHotelDto: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      hotelImages?: Express.Multer.File[];
    },
  ) {
    const agentId = user.sub;

    const thumbnail = files.thumbnail?.[0];
    const hotelImages = files.hotelImages || [];

    const updateData: Partial<CreateHotel> = { ...updateHotelDto };

    if (thumbnail) {
      updateData.thumbnail = `uploads/${thumbnail.filename}`;
    }

    if (hotelImages.length > 0) {
      updateData.images = hotelImages.map((file) => ({
        fileUrl: `uploads/${file.filename}`,
        type: 'HOTEL_IMAGE',
      }));
    }

    if (updateHotelDto.pricePerNight) {
      updateData.pricePerNight = parseFloat(updateHotelDto.pricePerNight);
    }

    return this.hotelService.updateHotel(id, agentId, updateData);
  }

  @Delete('/delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  async delete(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const agentId = user.sub;
    return this.hotelService.deleteHotel(id, agentId);
  }
}
