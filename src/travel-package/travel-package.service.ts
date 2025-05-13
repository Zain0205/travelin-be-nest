import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  CreateTravelPackage,
  Pagination,
} from 'src/model/travel-package.model';
import { TravelPackageValidation } from './travel-package.validation';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

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
          data: images.map((image: any) => ({
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

    const whereClause: Prisma.TravelPackageWhereInput = {};

    if (filters.title) {
      whereClause.title = {
        contains: filters.title,
      };
    }

    if (filters.location) {
      whereClause.location = {
        contains: filters.location,
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.price = {};
      if (filters.minPrice !== undefined) {
        whereClause.price.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        whereClause.price.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (
      filters.minDuration !== undefined ||
      filters.maxDuration !== undefined
    ) {
      whereClause.duration = {};
      if (filters.minDuration !== undefined) {
        whereClause.duration.gte = filters.minDuration;
      }
      if (filters.maxDuration !== undefined) {
        whereClause.duration.lte = filters.maxDuration;
      }
    }

    if (filters.agentId) {
      whereClause.agentId = filters.agentId;
    }

    if (filters.startDate) {
      whereClause.startDate = {
        gte: filters.startDate,
      };
    }

    if (filters.endDate) {
      whereClause.endDate = {
        lte: filters.endDate,
      };
    }

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

  async getTravelPackageById(id: number) {
    const travelPackage = await this.prisma.travelPackage.findUnique({
      where: { id },
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

    if (!travelPackage) {
      throw new HttpException('Travel package not found', HttpStatus.NOT_FOUND);
    }

    return travelPackage;
  }

  async updateTravelPackage(
    id: number,
    agentId: number,
    updateData: Partial<CreateTravelPackage>,
  ) {
    // Validate the travel package exists and belongs to the agent
    const existingPackage = await this.prisma.travelPackage.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingPackage) {
      throw new HttpException('Travel package not found', HttpStatus.NOT_FOUND);
    }

    if (existingPackage.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to update this travel package',
        HttpStatus.FORBIDDEN,
      );
    }

    // Validate the update data
    const validatedData = this.validationService.validate(
      TravelPackageValidation.UPDATE,
      updateData,
    );

    const { images, ...packageData } = validatedData;

    return this.prisma.$transaction(async (prisma) => {
      // Update travel package data
      const updatedPackage = await prisma.travelPackage.update({
        where: { id },
        data: {
          ...packageData,
          ...(packageData.price && {
            price: new Prisma.Decimal(
              typeof packageData.price === 'string'
                ? parseFloat(packageData.price)
                : packageData.price,
            ),
          }),
        },
      });

      if (images && images.length > 0) {
        const existingImages = await prisma.packageImage.findMany({
          where: { packageId: id },
        });

        await prisma.packageImage.deleteMany({
          where: { packageId: id },
        });

        await prisma.packageImage.createMany({
          data: images.map((image) => ({
            packageId: id,
            fileUrl: image.fileUrl,
            type: image.type,
          })),
        });

        // Delete old image files from storage
        existingImages.forEach((image) => {
          const filePath = join(process.cwd(), image.fileUrl);
          if (existsSync(filePath)) {
            try {
              unlinkSync(filePath);
            } catch (error) {
              console.error(`Failed to delete file: ${filePath}`, error);
            }
          }
        });
      }

      // Return updated package with relations
      return prisma.travelPackage.findUnique({
        where: { id },
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

  async deleteTravelPackage(id: number, agentId: number) {
    const existingPackage = await this.prisma.travelPackage.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingPackage) {
      throw new HttpException('Travel package not found', HttpStatus.NOT_FOUND);
    }

    if (existingPackage.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to delete this travel package',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const imagePaths = existingPackage.images.map((image) => image.fileUrl);
      if (existingPackage.thumbnail) {
        imagePaths.push(existingPackage.thumbnail);
      }

      await prisma.packageImage.deleteMany({
        where: { packageId: id },
      });

      await prisma.travelPackage.delete({
        where: { id },
      });

      imagePaths.forEach((path) => {
        const fullPath = join(process.cwd(), path);
        if (existsSync(fullPath)) {
          try {
            unlinkSync(fullPath);
          } catch (err) {
            console.error(`failed to dellete file ${fullPath}`, err);
          }
        }
      });

      return { id, deleted: true };
    });
  }
}
