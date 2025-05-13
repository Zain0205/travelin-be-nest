import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { FlightValidation } from './flight.validation';
import { CreateFlight } from 'src/model/flight.model';
import { Prisma } from '@prisma/client';
import { Pagination } from 'src/model/travel-package.model';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FlightService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) {}

  async createFlight(agentId: number, request: CreateFlight) {
    const data = this.validationService.validate(
      FlightValidation.CREATE,
      request,
    );

    return this.prisma.$transaction(async (prisma) => {
      const newFlight = await prisma.flight.create({
        data: {
          ...data,
          agentId: agentId,
          price:
            typeof data.price === 'string'
              ? parseFloat(data.price)
              : data.price,
          departureTime: new Date(data.departureTime),
          arrivalTime: new Date(data.arrivalTime),
        },
      });

      return prisma.flight.findUnique({
        where: {
          id: newFlight.id,
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async getAllFlights(pagination: Pagination, filters: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FlightWhereInput = {};

    if (filters.airlineName) {
      whereClause.airlineName = {
        contains: filters.airlineName,
      };
    }

    if (filters.origin) {
      whereClause.origin = {
        contains: filters.origin,
      };
    }

    if (filters.destination) {
      whereClause.destination = {
        contains: filters.destination,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.flight.findMany({
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.flight.count({
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

  async getFlightById(id: number) {
    const flight = await this.prisma.flight.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!flight) {
      throw new HttpException('Flight not found', HttpStatus.NOT_FOUND);
    }

    return flight;
  }

  async updateFlight(
    id: number,
    agentId: number,
    updateData: Partial<CreateFlight>,
  ) {
    // Validate the flight exists and belongs to the agent
    const existingFlight = await this.prisma.flight.findUnique({
      where: { id },
    });

    if (!existingFlight) {
      throw new HttpException('Flight not found', HttpStatus.NOT_FOUND);
    }

    if (existingFlight.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to update this flight data',
        HttpStatus.FORBIDDEN,
      );
    }

    // Validate the update data
    const validatedData = this.validationService.validate(
      FlightValidation.UPDATE,
      updateData,
    );

    return this.prisma.$transaction(async (prisma) => {
      // Update flight data
      const updatedFlight = await prisma.flight.update({
        where: { id },
        data: {
          ...validatedData,
          ...(validatedData.price && {
            price: new Prisma.Decimal(
              typeof validatedData.price === 'string'
                ? parseFloat(validatedData.price)
                : validatedData.price,
            ),
          }),
          ...(validatedData.departureTime && {
            departureTime: new Date(validatedData.departureTime),
          }),
          ...(validatedData.arrivalTime && {
            arrivalTime: new Date(validatedData.arrivalTime),
          }),
        },
      });

      // Return updated flight with relations
      return prisma.flight.findUnique({
        where: { id },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async deleteFlight(id: number, agentId: number) {
    const existingFlight = await this.prisma.flight.findUnique({
      where: { id },
    });

    if (!existingFlight) {
      throw new HttpException('Flight not found', HttpStatus.NOT_FOUND);
    }

    if (existingFlight.agentId !== agentId) {
      throw new HttpException(
        'You are not authorized to delete this flight data',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      // Delete the thumbnail if it exists
      if (existingFlight.thumnail) {
        const fullPath = join(process.cwd(), existingFlight.thumnail);
        if (existsSync(fullPath)) {
          try {
            unlinkSync(fullPath);
          } catch (err) {
            console.error(`Failed to delete file ${fullPath}`, err);
          }
        }
      }

      await prisma.flight.delete({
        where: { id },
      });

      return { id, deleted: true };
    });
  }
}
