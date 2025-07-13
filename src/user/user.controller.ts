import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { LoginRequest, UserRegistrationRequest, UserVerificationRequest } from 'src/model/user.model';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';

@Controller('/api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('/register')
  async register(@Body() request: UserRegistrationRequest): Promise<any> {
    return this.userService.register(request);
  }

  @Post('/login')
  async login(
    @Body() request: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.userService.login(request, res);
  }

  @Post('/logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.userService.logout(res);
  }

  @Post('/verify-email')
  async verifyEmail(@Body() request: UserVerificationRequest) {
    return this.userService.verifyEmail(request);
  }

  // Get current user profile - requires authentication
  @Get('/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    // user object from JWT payload
    const userId = user.sub;
    return this.userService.getCurrentUser(userId);
  }

  // Get all users with agent role
  @Get('/agents')
  async getAllAgents() {
    return this.userService.getAllAgents();
  }
}