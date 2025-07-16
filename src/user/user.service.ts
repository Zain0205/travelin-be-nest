import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/common/email.service';

import {
  LoginRequest,
  TokenResponse,
  UserRegistrationRequest,
  UserVerificationRequest,
} from 'src/model/user.model';
import { UserValidation } from './user.validation';

import { compare, hash } from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ValidationService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(request: UserRegistrationRequest) {
    const registerRequest = this.validationService.validate(
      UserValidation.REGISTER,
      request,
    );

    console.log(registerRequest);

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
        phone: request.phone,
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

  async login(request: LoginRequest, res: Response): Promise<TokenResponse> {
    const loginRequest = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    );

    const { email, password, rememberMe } = loginRequest;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (!user.isVerified) {
      throw new HttpException(
        'Please verify your email before logging in',
        400,
      );
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpException('Invalid password', 400);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Set token expiration based on rememberMe option
    const tokenExpiration = rememberMe ? '30d' : '7d';
    const cookieExpiration = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: tokenExpiration,
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: cookieExpiration,
    });

    return {
      accessToken,
      expiresIn: Math.floor(cookieExpiration / 1000),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(res: Response): Promise<{ message: string }> {
    res.clearCookie('accessToken');
    return {
      message: 'Logged out successfully',
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
      message: 'Email verified successfully. You can now log in.',
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    return user;
  }

  // New method to get all users with agent role
  async getAllAgents() {
    const agents = await this.prisma.user.findMany({
      where: {
        role: 'agent',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        isVerified: true,
        // Include related data if needed
        travelPackages: {
          select: {
            id: true,
            title: true,
            location: true,
            price: true,
          },
        },
        hotels: {
          select: {
            id: true,
            name: true,
            location: true,
            pricePerNight: true,
          },
        },
        flights: {
          select: {
            id: true,
            airlineName: true,
            origin: true,
            destination: true,
            price: true,
          },
        },
        bookings: true,
        reviews: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: agents,
      total: agents.length,
    };
  }
}
