import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Name must be a string!' })
  @IsNotEmpty({ message: 'Name is required!' })
  name: string;

  @IsEmail({}, { message: 'Invalid email!' })
  @IsNotEmpty({ message: 'Email is required!' })
  email: string;

  @IsString({ message: 'Password must be a string!' })
  @MinLength(6, { message: 'Password must be at least 6 characters long!' })
  @IsNotEmpty({ message: 'Password is required!' })
  password: string;
}
