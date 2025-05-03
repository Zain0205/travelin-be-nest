import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRegistrationRequest } from 'src/model/user.model';

@Controller('/api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('/register')
  async register(@Body() request: UserRegistrationRequest): Promise<any> {
    return this.userService.register(request)
  }
}
