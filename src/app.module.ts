import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { TravelPackageModule } from './travel-package/travel-package.module';

@Module({
  imports: [CommonModule, UserModule, TravelPackageModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
