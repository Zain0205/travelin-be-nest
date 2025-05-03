import { HttpException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/common/email.service';

import {
  UserRegistrationRequest,
  UserVerificationRequest,
} from 'src/model/user.model';
import { UserValidation } from './user.validation';

import { hash } from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async register(request: UserRegistrationRequest) {
    const registerRequest = this.validationService.validate(
      UserValidation.REGISTER,
      request,
    );

    const totalUser = await this.prisma.user.count({
      where: {
        email: registerRequest.email,
      },
    });

    if (totalUser != 0) {
      throw new HttpException('Email already exists', 400);
    }

    request.password = await hash(request.password, 10);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const user = await this.prisma.user.create({
      data: {
        name: registerRequest.name,
        email: registerRequest.email,
        password: request.password,
        role: registerRequest.role,
        verificationToken: verificationToken,
        verificationExpires: verificationExpires,
      },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(request: UserVerificationRequest) {
    const { token } = request;

    const user = await this.prisma.user.findUnique({
      where: {
        verificationToken: token,
        verificationExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new HttpException('Invalid or expired token', 400);
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        verificationToken: null,
        verificationExpires: null,
        isVerified: true,
      },
    });

    return {
      message: "Email verified successfully. You can now log in.",
    }
  }
}
