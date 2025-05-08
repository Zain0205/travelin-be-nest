import { Module } from '@nestjs/common';
import { TravelPackageController } from './travel-package.controller';
import { TravelPackageService } from './travel-package.service';

@Module({
  controllers: [TravelPackageController],
  providers: [TravelPackageService]
})
export class TravelPackageModule {}
