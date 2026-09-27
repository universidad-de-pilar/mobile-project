import { UsersModule } from 'src/users/users.module';
import { AuthController } from './api/auth.controller';
import { Module } from '@nestjs/common';
import { RegisterUseCase } from './application/register.use-case';
import { PASSWORD_HASHER } from './application/ports/password-hasher';
import { BcryptPasswordHasher } from './infraestructure/bcrypt-password-hasher';

@Module({
  imports: [
    UsersModule
  ],
  controllers: [ AuthController,],
  providers: [
    RegisterUseCase,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher
    }
  ],
  exports: []
})
export class AuthModule {}
