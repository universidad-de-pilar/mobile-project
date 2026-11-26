import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/create-user.dto';
import { RegisterUseCase } from '../application/register.use-case'
import { LoginUseCase } from '../application/login.use-case'
import { LoginUserDto } from './dto/login-user.dto';
import { Public } from './public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase
  ) {}

  @Post('/register')
  create(@Body() registerUserDto: RegisterUserDto, @Req() req: { platformAdmin?: boolean }) {
    return this.registerUseCase.execute(registerUserDto, req.platformAdmin === true);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.loginUseCase.execute(loginUserDto);
  }
}
