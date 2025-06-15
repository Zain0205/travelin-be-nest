import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { CreateTestimonialRequest, UpdateTestimonialRequest } from 'src/model/testimonial.model';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { Roles } from 'src/user/decorator/roles.decorator';
import { RolesGuard } from 'src/user/roles.guard';

@Controller('/api/testimonial')
export class TestimonialController {
  constructor(private testimonialService: TestimonialService) { }
  @Post()
  @UseGuards(JwtAuthGuard)
  async createTestimonial(
    @CurrentUser('id') userId: number,
    @Body() request: CreateTestimonialRequest,
  ) {
    return {
      message: 'Testimonial created successfully',
      data: await this.testimonialService.createTestimonial(userId, request),
    };
  }

  @Get()
  async getTestimonials(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      message: 'Testimonials retrieved successfully',
      data: await this.testimonialService.getTestimonial(
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
      ),
    };
  }

  @Get('/my-testimonials')
  @UseGuards(JwtAuthGuard)
  async getMyTestimonials(@CurrentUser('id') userId: number) {
    return {
      message: 'Your testimonials retrieved successfully',
      data: await this.testimonialService.getUserTestimonials(userId),
    };
  }

  @Put('/:testimonialId')
  @UseGuards(JwtAuthGuard)
  async updateTestimonial(
    @CurrentUser('id') userId: number,
    @Param('testimonialId', ParseIntPipe) testimonialId: number,
    @Body() request: UpdateTestimonialRequest,
  ) {
    return {
      message: 'Testimonial updated successfully',
      data: await this.testimonialService.updateTestimonial(testimonialId, userId, request),
    };
  }

  @Delete('/:testimonialId')
  @UseGuards(JwtAuthGuard)
  async deleteTestimonial(
    @CurrentUser('id') userId: number,
    @Param('testimonialId', ParseIntPipe) testimonialId: number,
  ) {
    await this.testimonialService.deleteTestimonial(testimonialId, userId);
    return {
      message: 'Testimonial deleted successfully',
    };
  }

  @Delete(':testimonialId/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminDeleteTestimonial(
    @Param('testimonialId', ParseIntPipe) testimonialId: number,
  ) {
    await this.testimonialService.deleteTestimonial(testimonialId, 0);
    return {
      message: 'Testimonial deleted successfully by admin',
    };
  }
}
