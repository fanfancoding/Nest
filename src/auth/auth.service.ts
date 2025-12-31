import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as svgCaptcha from 'svg-captcha';
import { LoginDto, CaptchaResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private captchaStore = new Map<string, { text: string; expires: number }>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 60 * 1000; // 1 minute

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    // Clean expired captchas every 5 minutes
    setInterval(() => this.cleanExpiredCaptchas(), 5 * 60 * 1000);
  }

  // Generate Captcha
  async generateCaptcha(): Promise<CaptchaResponse> {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      background: '#f0f2f5',
    });

    const key = this.generateRandomKey();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    this.captchaStore.set(key, {
      text: captcha.text.toLowerCase(),
      expires,
    });

    return {
      key,
      image: captcha.data,
    };
  }

  // Verify Captcha
  private verifyCaptcha(key: string, text: string): boolean {
    const stored = this.captchaStore.get(key);

    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expires) {
      this.captchaStore.delete(key);
      return false;
    }

    const isValid = stored.text === text.toLowerCase();

    // Delete captcha after verification (one-time use)
    this.captchaStore.delete(key);

    return isValid;
  }

  // Clean expired captchas
  private cleanExpiredCaptchas() {
    const now = Date.now();
    for (const [key, value] of this.captchaStore.entries()) {
      if (now > value.expires) {
        this.captchaStore.delete(key);
      }
    }
  }

  // Check if identifier is locked
  private async checkLockout(identifier: string): Promise<void> {
    const attempt = await this.prisma.loginAttempt.findUnique({
      where: { identifier },
    });

    if (attempt?.lockedUntil && new Date() < attempt.lockedUntil) {
      const remainingSeconds = Math.ceil(
        (attempt.lockedUntil.getTime() - Date.now()) / 1000,
      );
      throw new UnauthorizedException(
        `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`,
      );
    }
  }

  // Record failed attempt
  private async recordFailedAttempt(identifier: string): Promise<void> {
    const attempt = await this.prisma.loginAttempt.findUnique({
      where: { identifier },
    });

    if (attempt) {
      const newCount = attempt.failedCount + 1;
      const updateData: any = {
        failedCount: newCount,
        lastAttemptAt: new Date(),
      };

      if (newCount >= this.MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
      }

      await this.prisma.loginAttempt.update({
        where: { identifier },
        data: updateData,
      });
    } else {
      await this.prisma.loginAttempt.create({
        data: {
          identifier,
          failedCount: 1,
          lastAttemptAt: new Date(),
        },
      });
    }
  }

  // Clear failed attempts
  private async clearFailedAttempts(identifier: string): Promise<void> {
    await this.prisma.loginAttempt.updateMany({
      where: { identifier },
      data: {
        failedCount: 0,
        lockedUntil: null,
      },
    });
  }

  // Login
  async login(loginDto: LoginDto, ip: string) {
    const { username, password, captcha, captchaKey } = loginDto;

    // 1. Verify Captcha
    if (!this.verifyCaptcha(captchaKey, captcha)) {
      await this.recordFailedAttempt(ip);
      throw new BadRequestException('Invalid verification code');
    }

    // 2. Check lockout
    await this.checkLockout(ip);

    // 3. Find user
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      await this.recordFailedAttempt(ip);
      throw new UnauthorizedException('Invalid username or password');
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(ip);
      throw new UnauthorizedException('Invalid username or password');
    }

    // 5. Clear failed attempts on successful login
    await this.clearFailedAttempts(ip);

    // 6. Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  // Create user (for testing)
  async createUser(username: string, password: string, email?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });
  }

  // Generate random key
  private generateRandomKey(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
