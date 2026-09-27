import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/create-user.dto';
import { RegisterUseCase } from '../application/register.use-case'
import { LoginUseCase } from '../application/login.use-case'
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase
  ) {}

  @Post('/register')
  create(@Body() registerUserDto: RegisterUserDto) {
    return this.registerUseCase.execute(registerUserDto);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.loginUseCase.execute(loginUserDto);
  }
}
