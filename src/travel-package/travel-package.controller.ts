import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Delete,
  Req,
  Patch,
} from '@nestjs/common';

import { TravelPackageService } from './travel-package.service';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import {
  CreateTravelPackage,
  Pagination,
} from 'src/model/travel-package.model';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { FileFieldsUploadInterceptor } from 'src/common/file-upload.interceptor';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('/api/travel-package')
export class TravelPackageController {
  constructor(private readonly travelPackageService: TravelPackageService) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  @UseInterceptors(
    FileFieldsUploadInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'packageImages', maxCount: 10 },
    ]),
  )
  async create(
    @CurrentUser() user: any,
    @Body() request: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      packageImages?: Express.Multer.File[];
    },
  ) {
    const thumbnail = files.thumbnail?.[0];
    const packageImages = files.packageImages || [];

    const thumbnailUrl = thumbnail ? `uploads/${thumbnail.filename}` : null;

    const images = packageImages.map((file) => ({
      fileUrl: `uploads/${file.filename}`,
      type: 'PACKAGE_IMAGE',
    }));

    const packageData: CreateTravelPackage = {
      ...request,
      thumbnail: thumbnailUrl,
      images: images,
      price: parseFloat(request.price),
      duration: parseInt(request.duration),
      quota: parseInt(request.quota),
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
    };

    console.log(packageData);

    return this.travelPackageService.createTravelPackage(user.sub, packageData);
  }

  @Get()
  async getAllPackage(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('title') title?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minDuration') minDuration?: string,
    @Query('maxDuration') maxDuration?: string,
    @Query('agentId') agentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const filters = {
      title,
      location,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minDuration: minDuration ? parseInt(minDuration) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
      agentId: agentId ? parseInt(agentId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.travelPackageService.getAllTravelPackages(pagination, filters);
  }

  @Get('/:id')
  async getPackageById(@Param('id', ParseIntPipe) id: number) {
    return this.travelPackageService.getTravelPackageById(id);
  }

  @Patch('/update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'agent')
  @UseInterceptors(
    FileFieldsUploadInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'packageImages', maxCount: 10 },
    ]),
  )
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDto: any,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      packageImages?: Express.Multer.File[];
    },
  ) {
    const thumbnail = files.thumbnail?.[0];
    const packageImages = files.packageImages || [];

    const thumbnailUrl = thumbnail
      ? `uploads/${thumbnail.filename}`
      : undefined;

    const images =
      packageImages.length > 0
        ? packageImages.map((file) => ({
            fileUrl: `uploads/${file.filename}`,
            type: 'PACKAGE_IMAGE',
          }))
        : undefined;

    const updateData = {
      ...updatePackageDto,
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      ...(images && { images: images }),
      ...(updatePackageDto.price && {
        price: parseFloat(updatePackageDto.price),
      }),
      ...(updatePackageDto.duration && {
        duration: parseInt(updatePackageDto.duration),
      }),
      ...(updatePackageDto.quota && {
        quota: parseInt(updatePackageDto.quota),
      }),
      ...(updatePackageDto.startDate && {
        startDate: new Date(updatePackageDto.startDate),
      }),
      ...(updatePackageDto.endDate && {
        endDate: new Date(updatePackageDto.endDate),
      }),
    };

    return this.travelPackageService.updateTravelPackage(
      id,
      user.sub,
      updateData,
    );
  }

  @Delete('/delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  async delete(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const agentId = user.sub;
    return this.travelPackageService.deleteTravelPackage(id, agentId);
  }
}
