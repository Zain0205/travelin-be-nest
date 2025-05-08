import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  CreateTravelPackage,
  Pagination,
} from 'src/model/travel-package.model';
import { TravelPackageValidation } from './travel-package.validation';

@Injectable()
export class TravelPackageService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) {}

  async createTravelPackage(agentId: number, request: CreateTravelPackage) {
    const data = this.validationService.validate(
      TravelPackageValidation.CREATE,
      request,
    );
    const { images, ...packageData } = data;

    return this.prisma.$transaction(async (prisma) => {
      const newTravelPackage = await prisma.travelPackage.create({
        data: {
          ...packageData,
          agentId: agentId,
          price:
            typeof packageData.price === 'string'
              ? parseFloat(packageData.price)
              : packageData.price,
        },
      });

      if (images && images.length > 0) {
        await prisma.packageImage.createMany({
          data: images.map((image) => ({
            packageId: newTravelPackage.id,
            fileUrl: image.fileUrl,
            type: image.type,
          })),
        });
      }

      return prisma.travelPackage.findUnique({
        where: {
          id: newTravelPackage.id,
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          images: true,
        },
      });
    });
  }

  async getAllTravelPackages(pagination: Pagination, filters: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause = { ...filters };
    const [data, total] = await Promise.all([
      this.prisma.travelPackage.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.travelPackage.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTravelPackage() {}

  async deleteTravelPackage() {}
}
