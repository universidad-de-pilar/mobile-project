import { UsersModule } from 'src/users/users.module';
import { AuthController } from './api/auth.controller';
import { Module } from '@nestjs/common';
import { RegisterUseCase } from './application/register.use-case';
import { PASSWORD_HASHER } from './application/ports/password-hasher';
import { BcryptPasswordHasher } from './infraestructure/bcrypt-password-hasher';
import { LoginUseCase } from './application/login.use-case';
import { TOKEN_SERVICE } from './application/ports/token-service';
import { JwtTokenService } from './infraestructure/jwt-token-service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject:[ConfigService],
      useFactory:(config:ConfigService) => {
        const expiresIn = Number(config.getOrThrow<string>('JWT_EXPIRE_SECONDS'));
        if (!Number.isFinite(expiresIn) || expiresIn <= 0){
          throw new Error("JWT_EXPIRE_SECONDS debe ser un numero positivo")
        }

        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn:expiresIn
          }
        }
      }
    })
  ],
  controllers: [ AuthController,],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService
    }
  ],
  exports: []
})
export class AuthModule {}
