import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { CreateReviewRequest, UpdateReviewRequest } from 'src/model/reviews.model';

@Controller('/api/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewService: ReviewsService) { }

  @Post('/packages/:packageId')
  async createPackageReview(
    @CurrentUser() user: any,
    @Param('packageId', ParseIntPipe) packageId: number,
    @Body() request: CreateReviewRequest,
  ) {
    return {
      message: 'Review created successfully',
      data: await this.reviewService.createPackageReviews(user.sub, packageId, request),
    };
  }

  @Post('/hotels/:hotelId')
  async createHotelReview(
    @CurrentUser() user: any,
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() request: CreateReviewRequest,
  ) {

    return {
      message: 'Review created successfully',
      data: await this.reviewService.createHotelReviews(user.sub, hotelId, request),
    };
  }

  @Post('/flights/:flightId')
  async createFlightReview(
    @CurrentUser() user: any,
    @Param('flightId', ParseIntPipe) flightId: number,
    @Body() request: CreateReviewRequest,
  ) {
    return {
      message: 'Review created successfully',
      data: await this.reviewService.createFlightReviews(user.sub, flightId, request),
    };
  }

  @Get('/packages/:packageId')
  async getPackageReviews(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Query() query: any,
  ) {
    return {
      message: 'Reviews retrieved successfully',
      data: await this.reviewService.getPackageReviews(packageId, query),
    };
  }

  @Get('/my-reviews')
  async getMyReviews(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      message: 'Your reviews retrieved successfully',
      data: await this.reviewService.getUserReviews(
        user.id,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
      ),
    };
  }

  @Put('/:reviewId')
  async updateReview(
    @CurrentUser() user: any,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() request: UpdateReviewRequest,
  ) {
    return {
      message: 'Review updated successfully',
      data: await this.reviewService.updateReview(reviewId, user.id, request),
    };
  }

  @Delete('/:reviewId')
  async deleteReview(
    @CurrentUser() user: any,
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ) {
    await this.reviewService.deleteReview(reviewId, user.id);
    return {
      message: 'Review deleted successfully',
    };
  }
}
