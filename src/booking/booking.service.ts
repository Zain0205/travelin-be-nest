import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingType } from 'prisma/generated';
import { PrismaService } from 'src/common/prisma.service';
import { BookingInput, GetBookingsQuery } from 'src/model/booking.model';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async createBooking(data: BookingInput, userId: number) {
    let totalPrice = 0;
    let booking: any;

    switch (data.type) {
      case BookingType.package:
        booking = await this.createPackageBooking(data, userId);
        break;
      case BookingType.flight:
        booking = await this.createFlightBooking(data, userId);
        break;
      case BookingType.hotel:
        booking = await this.createHotelBooking(data, userId);
        break;
      case BookingType.custom:
        booking = await this.createCustomBooking(data, userId);
        break;
      default:
        throw new BadRequestException('Invalid booking type');
    }

    return booking;
  }

  private async createPackageBooking(
    data: BookingInput & { type: 'package' },
    userId: number,
  ) {
    const travelPackage = await this.prisma.travelPackage.findUnique({
      where: { id: data.packageId },
    });

    if (!travelPackage) {
      throw new NotFoundException(
        `Travel package with ID ${data.packageId} not found`,
      );
    }

    if (travelPackage.quota <= 0) {
      throw new BadRequestException('This travel package is fully booked');
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        packageId: data.packageId,
        travelDate: data.travelDate,
        totalPrice: travelPackage.price,
        status: 'pending',
        paymentStatus: 'unpaid',
        type: BookingType.package,
      },
      include: {
        travelPackage: true,
        user: true,
      },
    });

    await this.prisma.travelPackage.update({
      where: { id: data.packageId },
      data: { quota: { decrement: 1 } },
    });

    return booking;
  }

  private async createHotelBooking(
    data: BookingInput & { type: 'hotel' },
    userId: number,
  ) {
    if (!data.hotels || data.hotels.length === 0) {
      throw new BadRequestException(
        'Hotel booking requires at least one hotel',
      );
    }

    let totalPrice = 0;
    const hotelBookings: any = [];

    for (const hotel of data.hotels) {
      const hotelData = await this.prisma.hotel.findUnique({
        where: { id: hotel.hotelId },
      });

      if (!hotelData) {
        throw new NotFoundException(`Hotel with ID ${hotel.hotelId} not found`);
      }

      const hotelPrice =
        parseFloat(hotelData.pricePerNight.toString()) * hotel.nights;
      totalPrice += hotelPrice;

      hotelBookings.push({
        hotelId: hotel.hotelId,
        checkInDate: hotel.checkInDate,
        checkOutDate: hotel.checkOutDate,
        nights: hotel.nights,
        totalPrice: hotelPrice,
      });
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        travelDate: data.travelDate,
        totalPrice,
        status: 'pending',
        paymentStatus: 'unpaid',
        type: BookingType.hotel,
        bookingHotels: {
          create: hotelBookings,
        },
      },
      include: {
        bookingHotels: {
          include: {
            hotel: true,
          },
        },
        user: true,
      },
    });

    return booking;
  }

  private async createFlightBooking(
    data: BookingInput & { type: 'flight' },
    userId: number,
  ) {
    if (!data.flights || data.flights.length === 0) {
      throw new BadRequestException(
        'Flight booking requires at least one flight',
      );
    }

    let totalPrice = 0;
    const flightBookings: any = [];

    for (const flight of data.flights) {
      const flightData = await this.prisma.flight.findUnique({
        where: { id: flight.flightId },
      });

      if (!flightData) {
        throw new NotFoundException(
          `Flight with ID ${flight.flightId} not found`,
        );
      }

      const flightPrice = parseFloat(flightData.price.toString());
      totalPrice += flightPrice;

      flightBookings.push({
        flightId: flight.flightId,
        passengerName: flight.passengerName,
        seatClass: flight.seatClass,
        totalPrice: flightPrice,
      });
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        travelDate: data.travelDate,
        totalPrice,
        status: 'pending',
        paymentStatus: 'unpaid',
        type: BookingType.flight,
        bookingFlights: {
          create: flightBookings,
        },
      },
      include: {
        bookingFlights: {
          include: {
            flight: true,
          },
        },
        user: true,
      },
    });

    return booking;
  }

  private async createCustomBooking(
    data: BookingInput & { type: 'custom' },
    userId: number,
  ) {
    const hasHotels = data.hotels && data.hotels.length > 0;
    const hasFlights = data.flights && data.flights.length > 0;

    if (!hasHotels && !hasFlights) {
      throw new BadRequestException(
        'Custom booking requires at least one hotel or flight',
      );
    }

    let totalPrice = 0;
    const hotelBookings: any = [];
    const flightBookings: any = [];

    if (hasHotels) {
      for (const hotel of data.hotels!) {
        const hotelData = await this.prisma.hotel.findUnique({
          where: { id: hotel.hotelId },
        });

        if (!hotelData) {
          throw new NotFoundException(
            `Hotel with ID ${hotel.hotelId} not found`,
          );
        }

        const hotelPrice =
          parseFloat(hotelData.pricePerNight.toString()) * hotel.nights;
        totalPrice += hotelPrice;

        hotelBookings.push({
          hotelId: hotel.hotelId,
          checkInDate: hotel.checkInDate,
          checkOutDate: hotel.checkOutDate,
          nights: hotel.nights,
          totalPrice: hotelPrice,
        });
      }
    }

    if (hasFlights) {
      for (const flight of data.flights!) {
        const flightData = await this.prisma.flight.findUnique({
          where: { id: flight.flightId },
        });

        if (!flightData) {
          throw new NotFoundException(
            `Flight with ID ${flight.flightId} not found`,
          );
        }

        const flightPrice = parseFloat(flightData.price.toString());
        totalPrice += flightPrice;

        flightBookings.push({
          flightId: flight.flightId,
          passengerName: flight.passengerName,
          seatClass: flight.seatClass,
          totalPrice: flightPrice,
        });
      }
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        travelDate: data.travelDate,
        totalPrice,
        status: 'pending',
        paymentStatus: 'unpaid',
        type: BookingType.custom,
        bookingHotels: {
          create: hotelBookings,
        },
        bookingFlights: {
          create: flightBookings,
        },
      },
      include: {
        bookingHotels: {
          include: {
            hotel: true,
          },
        },
        bookingFlights: {
          include: {
            flight: true,
          },
        },
        user: true,
      },
    });

    return booking;
  }

  async getBookings(query: GetBookingsQuery, userId: number, role?: string) {
    const {
      status,
      paymentStatus,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (type) whereClause.type = type;

    if (startDate && endDate) {
      whereClause.travelDate = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      whereClause.travelDate = {
        gte: startDate,
      };
    } else if (endDate) {
      whereClause.travelDate = {
        lte: endDate,
      };
    }

    if (role == 'customer') {
      whereClause.userId = userId;
    } else if (role == 'agent') {
      whereClause.OR = [
        {
          travelPackage: {
            agentId: userId,
          },
        },
        {
          bookingHotels: {
            some: {
              hotel: {
                agentId: userId,
              },
            },
          },
        },
        {
          bookingFlights: {
            some: {
              flight: {
                agentId: userId,
              },
            },
          },
        },
      ];
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          user: true,
          travelPackage: true,
          bookingHotels: {
            include: {
              hotel: true,
            },
          },
          payments: true,
        },
        orderBy: {
          bookingDate: 'desc',
        },
        skip,
        take: limit,
      }),

      this.prisma.booking.count({ where: whereClause }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(id: number, userId?: number, role?: string) {
    const whereClause: any = { id };

    if (role === 'customer') {
      whereClause.userId = userId;
    } else if (role === 'agent') {
      whereClause.OR = [
        {
          travelPackage: {
            agentId: userId,
          },
        },
        {
          bookingHotels: {
            some: {
              hotel: {
                agentId: userId,
              },
            },
          },
        },
        {
          bookingFlights: {
            some: {
              flight: {
                agentId: userId,
              },
            },
          },
        },
      ];
    }

     const booking = await this.prisma.booking.findFirst({
      where: whereClause,
      include: {
        user: true,
        travelPackage: true,
        bookingHotels: {
          include: {
            hotel: true,
          },
        },
        bookingFlights: {
          include: {
            flight: true,
          },
        },
        payments: true,
        reschedules: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }
}
