import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { AdminStatistics, AgentPerformance, AgentStatistics, MonthlyReport, PackagePerformance } from 'src/model/dashboard.model';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
  ) { }

  async getAgentStatistic(agentId: number): Promise<AgentStatistics> {
    const [
      packagesCount,
      hotelsCount,
      flightsCount,
      bookingsStats,
      activePackagesCount
    ] = await Promise.all([

      this.prisma.travelPackage.count({
        where: { agentId }
      }),

      this.prisma.hotel.count({
        where: { agentId }
      }),

      this.prisma.flight.count({
        where: { agentId }
      }),

      this.prisma.booking.aggregate({
        where: {
          OR: [
            { travelPackage: { agentId } },
            { bookingHotels: { some: { hotel: { agentId } } } },
            { bookingFlights: { some: { flight: { agentId } } } }
          ],
          status: { not: 'cancelled' }
        },
        _count: { id: true },
        _sum: { totalPrice: true }
      }),

      this.prisma.travelPackage.count({
        where: {
          agentId,
          endDate: { gte: new Date() }
        }
      })
    ]);

    return {
      totalPackages: packagesCount,
      totalHotels: hotelsCount,
      totalFlights: flightsCount,
      totalBookings: bookingsStats._count.id || 0,
      totalRevenue: Number(bookingsStats._sum.totalPrice || 0),
      activePackages: activePackagesCount
    }
  }

  async getAgentMonthlyReport(agentId: number, year: number, month?: number): Promise<MonthlyReport[]> {
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month
      ? new Date(year, month, 0)
      : new Date(year + 1, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        OR: [
          { travelPackage: { agentId } },
          { bookingHotels: { some: { hotel: { agentId } } } },
          { bookingFlights: { some: { flight: { agentId } } } }
        ],
        bookingDate: {
          gte: startDate,
          lte: endDate
        },
        status: { not: 'cancelled' }
      },
      include: {
        travelPackage: true,
        bookingHotels: { include: { hotel: true } },
        bookingFlights: { include: { flight: true } }
      }
    });


    const monthlyData = new Map<string, {
      totalBookings: number;
      totalRevenue: number;
      packageBookings: number;
      hotelBookings: number;
      flightBookings: number;
    }>();

    bookings.forEach(booking => {
      const bookingMonth = booking.bookingDate.getMonth() + 1;
      const bookingYear = booking.bookingDate.getFullYear();
      const key = `${bookingYear}-${bookingMonth.toString().padStart(2, '0')}`;

      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          totalBookings: 0,
          totalRevenue: 0,
          packageBookings: 0,
          hotelBookings: 0,
          flightBookings: 0
        });
      }

      const data = monthlyData.get(key)!;
      console.log('Booking:', booking)
      // console.log(data)
      data.totalBookings++;
      data.totalRevenue += Number(booking.totalPrice);

      if (booking.type === 'package') data.packageBookings++;
      if (booking.type === 'hotel') data.hotelBookings++;
      if (booking.type === 'flight') data.flightBookings++;
    });

    return Array.from(monthlyData.entries()).map(([key, data]) => {
      const [yearStr, monthStr] = key.split('-');
      return {
        month: monthStr,
        year: parseInt(yearStr),
        ...data
      };
    });
  }

  async getAgentPackages(agentId: number): Promise<PackagePerformance[]> {
    const packages = await this.prisma.travelPackage.findMany({
      where: { agentId },
      include: {
        bookings: {
          where: { status: { not: 'cancelled' } }
        },
        reviews: true,
        _count: {
          select: {
            bookings: {
              where: { status: { not: 'cancelled' } }
            },
            reviews: true
          }
        }
      }
    });

    return packages.map(pkg => {
      const totalRevenue = pkg.bookings.reduce((sum, booking) =>
        sum + Number(booking.totalPrice), 0);

      const averageRating = pkg.reviews.length > 0
        ? pkg.reviews.reduce((sum, review) => sum + review.rating, 0) / pkg.reviews.length
        : 0;

      return {
        id: pkg.id,
        title: pkg.title,
        totalBookings: pkg._count.bookings,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: pkg._count.reviews,
        location: pkg.location
      };
    });
  }

  async getAdminStatistics(): Promise<AdminStatistics> {
    const [
      bookingsStats,
      usersCount,
      agentsCount,
      packagesCount,
      hotelsCount,
      flightsCount,
      pendingBookings,
      completedBookings
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: { not: 'cancelled' } },
        _count: { id: true },
        _sum: { totalPrice: true }
      }),

      this.prisma.user.count({
        where: { role: 'customer' }
      }),

      this.prisma.user.count({
        where: { role: 'agent' }
      }),

      this.prisma.travelPackage.count(),

      this.prisma.hotel.count(),

      this.prisma.flight.count(),

      this.prisma.booking.count({
        where: { status: 'pending' }
      }),

      this.prisma.booking.count({
        where: { status: 'confirmed' }
      })
    ]);

    return {
      totalBookings: bookingsStats._count.id || 0,
      totalRevenue: Number(bookingsStats._sum.totalPrice || 0),
      totalUsers: usersCount,
      totalAgents: agentsCount,
      totalPackages: packagesCount,
      totalHotels: hotelsCount,
      totalFlights: flightsCount,
      pendingBookings,
      completedBookings
    };
  }

  async getAdminMonthlyReport(year: number, month?: number): Promise<MonthlyReport[]> {
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month
      ? new Date(year, month, 0)
      : new Date(year + 1, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: startDate,
          lte: endDate
        },
        status: { not: 'cancelled' }
      }
    });

    const monthlyData = new Map<string, {
      totalBookings: number;
      totalRevenue: number;
      packageBookings: number;
      hotelBookings: number;
      flightBookings: number;
    }>();

    bookings.forEach(booking => {
      const bookingMonth = booking.bookingDate.getMonth() + 1;
      const bookingYear = booking.bookingDate.getFullYear();
      const key = `${bookingYear}-${bookingMonth.toString().padStart(2, '0')}`;

      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          totalBookings: 0,
          totalRevenue: 0,
          packageBookings: 0,
          hotelBookings: 0,
          flightBookings: 0
        });
      }

      const data = monthlyData.get(key)!;
      data.totalBookings++;
      data.totalRevenue += Number(booking.totalPrice);

      if (booking.type === 'package') data.packageBookings++;
      if (booking.type === 'hotel') data.hotelBookings++;
      if (booking.type === 'flight') data.flightBookings++;
    });

    return Array.from(monthlyData.entries()).map(([key, data]) => {
      const [yearStr, monthStr] = key.split('-');
      return {
        month: monthStr,
        year: parseInt(yearStr),
        ...data
      };
    });
  }

  async getAgentPerformances(): Promise<AgentPerformance[]> {
    const agents = await this.prisma.user.findMany({
      where: { role: 'agent' },
      include: {
        travelPackages: {
          include: {
            bookings: {
              where: { status: { not: 'cancelled' } }
            },
            reviews: true
          }
        }
      }
    });

    return agents.map(agent => {
      const totalPackages = agent.travelPackages.length;
      let totalBookings = 0;
      let totalRevenue = 0;
      let totalReviews = 0;
      let totalRating = 0;

      agent.travelPackages.forEach(pkg => {
        totalBookings += pkg.bookings.length;
        totalRevenue += pkg.bookings.reduce((sum, booking) =>
          sum + Number(booking.totalPrice), 0);
        totalReviews += pkg.reviews.length;
        totalRating += pkg.reviews.reduce((sum, review) =>
          sum + review.rating, 0);
      });

      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      return {
        agentId: agent.id,
        agentName: agent.name,
        totalPackages,
        totalBookings,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews
      };
    });
  }
}
