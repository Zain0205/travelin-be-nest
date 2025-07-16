import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { CreateReviewRequest, ReviewListResponse, ReviewResponse, UpdateReviewRequest, UserReviewsResponse } from 'src/model/reviews.model';
import { CreateReviewSchema, ReviewQuerySchema, UpdateReviewSchema } from './reviews.validation';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) { }

  async createPackageReviews(
    userId: number,
    packageId: number,
    validatedRequest: CreateReviewRequest,
  ): Promise<ReviewResponse> {

    const travelPackage = this.prisma.travelPackage.findUnique({
      where: { id: packageId },
    });

    if (!travelPackage) {
      throw new NotFoundException(`Travel package not found`);
    }

    const completedBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        packageId,
        status: 'confirmed',
        paymentStatus: 'paid',
        travelDate: {
          lt: new Date(),
        },
      },
    });

    if (!completedBooking) {
      throw new ForbiddenException(
        'You can only review packages you have booked and completed',
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId,
        packageId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this package');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        packageId,
        rating: validatedRequest.rating,
        comment: validatedRequest.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(review);
  }

  async createHotelReviews(
    userId: number,
    hotelId: number,
    validatedRequest: CreateReviewRequest,
  ): Promise<ReviewResponse> {

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const completedBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: 'confirmed',
        paymentStatus: 'paid',
        bookingHotels: {
          some: {
            hotelId,
            checkOutDate: {
              lt: new Date(),
            },
          },
        },
      },
    });

    if (!completedBooking) {
      throw new ForbiddenException(
        'You can only review hotels you have booked and stayed at',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        hotelId,
        rating: validatedRequest.rating,
        comment: validatedRequest.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(review);
  }

  async createFlightReviews(
    userId: number,
    flightId: number,
    validatedRequest: CreateReviewRequest
  ): Promise<ReviewResponse> {

    const flight = await this.prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    const completedBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: 'confirmed',
        paymentStatus: 'paid',
        bookingFlights: {
          some: {
            flightId,
          },
        },
      },
    });

    if (!completedBooking) {
      throw new ForbiddenException('You can only review flights you have booked');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        flightId,
        rating: validatedRequest.rating,
        comment: validatedRequest.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(review)
  }

  async getPackageReviews(
    packageId: number,
    query: any,
  ): Promise<ReviewListResponse> {
    const validatedQuery = this.validationService.validate(ReviewQuerySchema, query);
    const page = validatedQuery.page || 1;
    const limit = validatedQuery.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      packageId,
      ...(validatedQuery.rating && { rating: validatedQuery.rating }),
    };

    const orderBy = this.getOrderBy(validatedQuery.sortBy);

    const [reviews, totalReviews] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: orderBy,
      }),
      this.prisma.review.count({ where }),
    ]);

    const allReviews = await this.prisma.review.findMany({
      where: { packageId },
      select: { rating: true },
    });

    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
      : 0;

    const ratingDistribution = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length,
    };

    return {
      reviews: reviews.map(this.mapToReviewResponse),
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }

  async getUserReviews(userId: number, page = 1, limit = 10): Promise<UserReviewsResponse> {
    const skip = (page - 1) * limit;

    const reviews = await this.prisma.review.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        package: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const totalCount = await this.prisma.review.count({
      where: { userId },
    });

    const mappedReviews = reviews.map(review => ({
      ...this.mapToReviewResponse(review),
      entity: {
        id: review.package?.id || 0,
        title: review.package?.title,
        type: 'package' as const,
      },
    }));

    return {
      reviews: mappedReviews,
      totalCount,
    };
  }

  async updateReview(
    reviewId: number,
    userId: number,
    request: UpdateReviewRequest,
  ): Promise<ReviewResponse> {
    const validatedRequest = this.validationService.validate(UpdateReviewSchema, request);

    const existingReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: validatedRequest,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToReviewResponse(updatedReview);
  }

  async deleteReview(reviewId: number, userId: number): Promise<void> {
    const existingReview = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });
  }

  private mapToReviewResponse(review: any): ReviewResponse {
    return {
      id: review.id,
      userId: review.userId,
      packageId: review.packageId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: {
        id: review.user.id,
        name: review.user.name,
      },
    };
  }

  private getOrderBy(sortBy?: string): Prisma.ReviewOrderByWithRelationInput {
    switch (sortBy) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'rating_high':
        return { rating: 'desc' };
      case 'rating_low':
        return { rating: 'asc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}
