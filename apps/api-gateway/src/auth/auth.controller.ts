import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '@app/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDTO: RegisterDto) {
    return this.authService.register(registerDTO);
  }

  @Post('login')
  login(@Body() loginDTO: LoginDto) {
    return this.authService.login(loginDTO);
  }

  @Get('profile')
  getProfile(@Headers('authorization') token: string) {
    return this.authService.getProfile(token);
  }
}
