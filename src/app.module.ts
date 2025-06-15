import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { TravelPackageModule } from './travel-package/travel-package.module';
import { HotelModule } from './hotel/hotel.module';
import { FlightModule } from './flight/flight.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TestimonialModule } from './testimonial/testimonial.module';

@Module({
  imports: [CommonModule, UserModule, TravelPackageModule, HotelModule, FlightModule, BookingModule, PaymentModule, NotificationModule, DashboardModule, ReviewsModule, TestimonialModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
