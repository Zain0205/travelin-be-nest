import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { ValidationService } from './validation.service';
import { EmailService } from './email.service';
import { ErrorFilter } from './error.filter';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [
    PrismaService,
    ValidationService,
    EmailService,
    {
      provide: 'APP_FILTER',
      useClass: ErrorFilter,
    },
  ],
  exports: [PrismaService, ValidationService, EmailService],
})
export class CommonModule {}
