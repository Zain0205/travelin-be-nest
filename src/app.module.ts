import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { TravelPackageModule } from './travel-package/travel-package.module';
import { HotelModule } from './hotel/hotel.module';
import { FlightModule } from './flight/flight.module';

@Module({
  imports: [CommonModule, UserModule, TravelPackageModule, HotelModule, FlightModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
