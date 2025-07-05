import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { CreateHotel } from 'src/model/hotel.model';
import { HotelValidation } from './hotel.validation';
import { Pagination } from 'src/model/travel-package.model';
import { Prisma } from '@prisma/client';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class HotelService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) {}

  async createHotel(agentId: number, data: CreateHotel) {
    // const data = this.validationService.validate(
    //   HotelValidation.CREATE,
    //   request,
    // );

    const { images, ...hotelData } = data;

    console.log(hotelData);

    return this.prisma.$transaction(async (prisma) => {
      const newHotel = await prisma.hotel.create({
        data: {
          ...hotelData,
          agentId: agentId,
          pricePerNight:
            typeof hotelData.pricePerNight === 'string'
              ? parseFloat(hotelData.pricePerNight)
              : hotelData.pricePerNight,
        },
      });

      if (images && images.length > 0) {
        await prisma.hotelImage.createMany({
          data: images.map((image: any) => ({
            hotelId: newHotel.id,
            fileUrl: image.fileUrl,
            type: image.type,
          })),
        });
      }

      return prisma.hotel.findUnique({
        where: {
          id: newHotel.id,
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

  async getAllHotels(pagination: Pagination, filters: any, agentId?: number) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.HotelWhereInput = {};

    if (filters.name) {
      whereClause.name = {
        contains: filters.name,
      };
    }

    if (filters.location) {
      whereClause.location = {
        contains: filters.location,
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.pricePerNight = {};

      if (filters.minPrice !== undefined) {
        whereClause.pricePerNight.gte = filters.minPrice;
      }

      if (filters.maxPrice !== undefined) {
        whereClause.pricePerNight.lte = filters.maxPrice;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.hotel.findMany({
        skip,
        take: limit,
        where: {
          ...whereClause,
          agentId: agentId ? agentId : undefined, // Only filter by agentId if provided
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.hotel.count({
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

  async getHotelById(id: number) {
    const hotel = await this.prisma.hotel.findUnique({
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

    if (!hotel) {
      throw new HttpException('Hotel not found', HttpStatus.NOT_FOUND);
    }

    return hotel;
  }

  async updateHotel(
    id: number,
    agentId: number,
    updateData: Partial<CreateHotel>,
  ) {
    const existingHotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingHotel) {
      throw new HttpException('Hotel not found', HttpStatus.NOT_FOUND);
    }

    if (existingHotel.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to update this hotel data',
        HttpStatus.FORBIDDEN,
      );
    }

    const validatedData = this.validationService.validate(
      HotelValidation.UPDATE,
      updateData,
    );

    const { images, ...hotelData } = validatedData;

    return this.prisma.$transaction(async (prisma) => {
      const updatedHotel = await prisma.hotel.update({
        where: { id },
        data: {
          ...hotelData,
          ...(hotelData.price && {
            price: new Prisma.Decimal(
              typeof hotelData.price === 'string'
                ? parseFloat(hotelData.price)
                : hotelData.price,
            ),
          }),
        },
      });

      if (images && images.length > 0) {
        const existingImages = await prisma.hotelImage.findMany({
          where: { hotelId: id },
        });

        await prisma.hotelImage.deleteMany({
          where: { hotelId: id },
        });

        await prisma.hotelImage.createMany({
          data: images.map((image) => ({
            hotelId: id,
            fileUrl: image.fileUrl,
            type: image.type,
          })),
        });

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
      return prisma.hotel.findUnique({
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

  async deleteHotel(id: number, agentId: number) {
    const existingHotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingHotel) {
      throw new HttpException('Hotel not found', HttpStatus.NOT_FOUND);
    }

    if (existingHotel.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to delete this hotel data',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const imagePaths = existingHotel.images.map((image) => image.fileUrl);
      if (existingHotel.thumbnail) {
        imagePaths.push(existingHotel.thumbnail);
      }

      await prisma.hotelImage.deleteMany({
        where: { hotelId: id },
      });

      await prisma.hotel.delete({
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
