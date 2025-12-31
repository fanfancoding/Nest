import {
  Controller,
  Post,
  Body,
  Get,
  Ip,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('captcha')
  async getCaptcha() {
    return this.authService.generateCaptcha();
  }

  @Post('login')
  async login(
    @Body(new ValidationPipe()) loginDto: LoginDto,
    @Ip() ip: string,
  ) {
    return this.authService.login(loginDto, ip);
  }

  // Test endpoint to create user
  @Post('register')
  async register(
    @Body() body: { username: string; password: string; email?: string },
  ) {
    return this.authService.createUser(
      body.username,
      body.password,
      body.email,
    );
  }
}
