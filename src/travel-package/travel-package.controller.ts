import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';

import { TravelPackageService } from './travel-package.service';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { CreateTravelPackage } from 'src/model/travel-package.model';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { FileFieldsUploadInterceptor } from 'src/common/file-upload.interceptor';

@Controller('/api/travel-package')
export class TravelPackageController {
  constructor(private readonly travelPackageService: TravelPackageService) {}

  @Post('/create')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.agent)
  @UseInterceptors(
    FileFieldsUploadInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'packageImages', maxCount: 10 },
    ]),
  )
  async create(
    @CurrentUser() user: { id: number; role: Role },
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

    return this.travelPackageService.createTravelPackage(user.id, packageData);
  }
}
