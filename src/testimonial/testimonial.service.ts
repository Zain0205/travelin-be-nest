import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { CreateTestimonialRequest, TestimonialResponse, UpdateTestimonialRequest } from 'src/model/testimonial.model';
import { CreateTestimonialSchema, UpdateTestimonialSchema } from './testimonial.validation';

@Injectable()
export class TestimonialService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService
  ) { }

  async createTestimonial(
    userId: number,
    request: CreateTestimonialRequest
  ): Promise<TestimonialResponse> {
    const validatedRequest = this.validationService.validate(CreateTestimonialSchema, request)

    const testimonial = await this.prisma.testimonial.create({
      data: {
        userId,
        content: validatedRequest.content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return this.mapToTestimonialResponse(testimonial)
  }

  async getTestimonial(page = 1, limit = 10): Promise<{
    testimonials: TestimonialResponse[],
    totalCount: number
  }> {
    const skip = (page - 1) * limit;

    const [testimonials, totalCount] = await Promise.all([
      this.prisma.testimonial.findMany({
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
        },
      }),
      this.prisma.testimonial.count(),
    ]);

    return {
      testimonials: testimonials.map(this.mapToTestimonialResponse),
      totalCount,
    };
  }

  async getUserTestimonials(userId: number): Promise<TestimonialResponse[]> {
    const testimonials = await this.prisma.testimonial.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return testimonials.map(this.mapToTestimonialResponse);
  }

  async updateTestimonial(
    testimonialId: number,
    userId: number,
    request: UpdateTestimonialRequest,
  ): Promise<TestimonialResponse> {
    const validatedRequest = this.validationService.validate(UpdateTestimonialSchema, request);

    const existingTestimonial = await this.prisma.testimonial.findUnique({
      where: { id: testimonialId },
    });

    if (!existingTestimonial) {
      throw new NotFoundException('Testimonial not found');
    }

    if (existingTestimonial.userId !== userId) {
      throw new ForbiddenException('You can only update your own testimonials');
    }

    const updatedTestimonial = await this.prisma.testimonial.update({
      where: { id: testimonialId },
      data: { content: validatedRequest.content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapToTestimonialResponse(updatedTestimonial);
  }

  async deleteTestimonial(testimonialId: number, userId: number): Promise<void> {
    const existingTestimonial = await this.prisma.testimonial.findUnique({
      where: { id: testimonialId },
    });

    if (!existingTestimonial) {
      throw new NotFoundException('Testimonial not found');
    }

    if (existingTestimonial.userId !== userId) {
      throw new ForbiddenException('You can only delete your own testimonials');
    }

    await this.prisma.testimonial.delete({
      where: { id: testimonialId },
    });
  }

  private mapToTestimonialResponse(testimonial: any): TestimonialResponse {
    return {
      id: testimonial.id,
      userId: testimonial.userId,
      content: testimonial.content,
      createdAt: testimonial.createdAt,
      user: {
        id: testimonial.user.id,
        name: testimonial.user.name,
      },
    };
  }
}

