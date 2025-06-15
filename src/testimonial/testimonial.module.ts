import { Module } from '@nestjs/common';
import { TestimonialController } from './testimonial.controller';
import { TestimonialService } from './testimonial.service';

@Module({
  controllers: [TestimonialController],
  providers: [TestimonialService]
})
export class TestimonialModule {}
