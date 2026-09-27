import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/create-user.dto';
import { RegisterUseCase } from '../application/register.use-case'

@Controller('auth')
export class AuthController {
  constructor(private readonly registerUseCase: RegisterUseCase) {}

  @Post('/register')
  create(@Body() registerUserDto: RegisterUserDto) {
    return this.registerUseCase.execute(registerUserDto);
  }

  /* @Post('/login')
  login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  } */
}
