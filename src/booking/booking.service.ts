import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingType } from 'prisma/generated';
import { PrismaService } from 'src/common/prisma.service';
import {
  BookingInput,
  GetBookingsQuery,
  RescheduleInput,
} from 'src/model/booking.model';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  async createBooking(data: BookingInput, userId: number) {
    let totalPrice = 0;
    let booking: any;
    console.log("service")
    console.log(data)

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

    const notification = this.notificationService.notifyBookingCreated(
      userId,
      booking.id,
    );

    await this.notificationGateway.sendNotifToUser(userId, {
      ...notification,
      booking: {
        id: booking.id,
        type: booking.type,
        totalPrice: booking.totalPrice,
      },
    });

    return booking;
  }

  private async createPackageBooking(
    data: any & { type: 'package' },
    userId: number,
  ) {
    console.log(data)
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
        travelDate: data.hotels[0].checkInDate,
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
          bookingFlights: {
            include: {
              flight: true
            }
          },
          payments: true,
        },
        orderBy: {
          bookingDate: 'desc',
        },
        skip,
        take: 10,
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

  async updateBookingStatus(
    id: number,
    status: BookingStatus,
    userId: number,
    role: string,
  ) {
    let notification: any;
    const booking = await this.getBookingById(id, userId, role);

    if (role === 'customer' && booking.userId !== userId) {
      throw new BadRequestException('You can only update your own bookings');
    }

    if (role === 'agent') {
      let isAgentBooking = false;

      if (booking.travelPackage && booking.travelPackage.agentId === userId) {
        isAgentBooking = true;
      }

      if (!isAgentBooking) {
        const hasHotelFromAgent = booking.bookingHotels?.some(
          (bh) => bh.hotel.agentId === userId,
        );
        const hasFlightFromAgent = booking.bookingFlights?.some(
          (bf) => bf.flight.agentId === userId,
        );

        if (!hasHotelFromAgent && !hasFlightFromAgent) {
          throw new BadRequestException(
            'You can only update bookings for your packages/hotels/flights',
          );
        }
      }
    }

    if (role === 'customer' && status !== 'rejected') {
      throw new BadRequestException('Customers can only cancel their bookings');
    }

    if (status === 'rejected' && booking.paymentStatus === 'paid') {
      if (booking.packageId) {
        await this.prisma.travelPackage.update({
          where: { id: booking.packageId },
          data: { quota: { increment: 1 } },
        });
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status },
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
      },
    });
    console.log("TEEESSSSTTTT")
    console.log(id)
    console.log(updatedBooking.id)
    console.log("ENNNDDDD")

    if (status === 'confirmed') {
      notification = await this.notificationService.notifyBookingConfirmed(
        userId,
        updatedBooking.id,
      );
    } else {
      notification = await this.notificationService.notifyBookingRejected(
        userId,
        updatedBooking.id,
      );
    }

    if (notification) {
      await this.notificationGateway.sendNotifToUser(updatedBooking.userId, {
        ...notification,
        booking: {
          id: updatedBooking.id,
          status: updatedBooking.status,
        },
      });
    }

    return updatedBooking;
  }

  async requestReschedule(data: RescheduleInput, userId: number) {
    const { bookingId, requestedDate } = data;

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${bookingId} not found or does not belong to user ${userId}`,
      );
    }

    const reschedule = await this.prisma.reschedule.create({
      data: {
        bookingId,
        requestedDate,
        status: 'pending',
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'pending',
      },
    });

    // TODO: send notification

    return {
      reschedule,
      // notification
    };
  }

  async handleRescheduleRequest(
    id: number,
    aprove: boolean,
    userId: number,
    role: string,
  ) {
    const reschedule = await this.prisma.reschedule.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
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
          },
        },
      },
    });

    if (!reschedule) {
      throw new NotFoundException(`Reschedule request with ID ${id} not found`);
    }

    if (role == 'customer') {
      throw new BadRequestException(
        'Customers cannot approve or reject reschedule requests',
      );
    }

    if (role == 'agent') {
      const booking = reschedule.booking;
      let isAgentBooking = false;

      if (booking.travelPackage && booking.travelPackage.agentId == userId) {
        isAgentBooking = true;
      } else {
        const hasHotelFromAgent = booking.bookingHotels?.some(
          (bh) => bh.hotel.agentId == userId,
        );
        const hasFlightFromAgent = booking.bookingFlights?.some(
          (bh) => bh.flight.agentId == userId,
        );

        isAgentBooking = hasHotelFromAgent || hasFlightFromAgent;
      }

      if (!isAgentBooking) {
        throw new BadRequestException(
          'You can only handle reschedule requests for bookings you are associated with as an agent.',
        );
      }
    }

    const newStatus = aprove ? 'approved' : 'rejected';

    await this.prisma.reschedule.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    let bookingStatus = 'pending';

    if (aprove) {
      await this.prisma.booking.update({
        where: { id: reschedule.bookingId },
        data: {
          travelDate: reschedule.requestedDate,
          status: 'confirmed',
        },
      });

      bookingStatus = 'confirmed';
    } else {
      await this.prisma.booking.update({
        where: { id: reschedule.bookingId },
        data: {
          status: 'confirmed',
        },
      });

      bookingStatus = 'confirmed';
    }

    // TODO: send notification

    return {
      success: true,
      status: newStatus,
      bookingStatus,
    };
  }
}
