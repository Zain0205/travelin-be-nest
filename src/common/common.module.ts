import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
    JwtModule.registerAsync({
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'), // ← ambil dari .env
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
      global: true, // ← bikin JwtModule jadi global
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
  exports: [PrismaService, ValidationService, EmailService, JwtModule],
})
export class CommonModule { }

