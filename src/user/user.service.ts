import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/common/email.service';

import {
  LoginRequest,
  RefreshTokenRequest,
  TokenResponse,
  UserRegistrationRequest,
  UserVerificationRequest,
} from 'src/model/user.model';
import { UserValidation } from './user.validation';

import { compare, hash } from 'bcrypt';
import * as crypto from 'crypto';
import { Response } from 'express';

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

  async login(request: LoginRequest, res: Response): Promise<any> {
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
      roles: [user.role],
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: rememberMe
        ? this.configService.get('JWT_REFRESH_EXPIRATION_LONG', "30d")
        : this.configService.get('JWT_REFRESH_EXPIRATION', "7d"),
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(
          Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
        ),
      },
    });

    const accessTokenExpiration = rememberMe
      ? 15 * 24 * 60 * 60 * 1000
      : 15 * 60 * 1000;

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: accessTokenExpiration,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(accessTokenExpiration / 1000),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(
    request: RefreshTokenRequest,
    res: Response,
  ): Promise<TokenResponse> {
    const { refreshToken } = request;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!storedToken) {
        throw new HttpException('Invalid refresh token', 401);
      }

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: [storedToken.user.role],
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      await this.prisma.refreshToken.delete({
        where: {
          id: storedToken.id,
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: payload.sub,
          expiresAt: expiresAt,
        },
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
        user: {
          id: storedToken.user.id,
          name: storedToken.user.name,
          email: storedToken.user.email,
          role: storedToken.user.role,
        },
      };
    } catch (error) {
      throw new HttpException('Invalid refresh token', 401);
    }
  }

  async logout(res: Response): Promise<{ message: string }> {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

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
}
