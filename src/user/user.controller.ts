import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { LoginRequest, RefreshTokenRequest, UserRegistrationRequest } from 'src/model/user.model';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @Post("/logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.userService.logout(res);
  }

  @Post('/refresh')
  async refreshToken(
    @Body() request: RefreshTokenRequest  ,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.userService.refreshToken(request, res);
  }
}
