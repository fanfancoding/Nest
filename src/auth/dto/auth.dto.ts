import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  captcha: string;

  @IsString()
  @IsNotEmpty()
  captchaKey: string;
}

export class CaptchaResponse {
  key: string;
  image: string;
}
