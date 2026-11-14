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
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './api/jwt-auth.guard';
import { RolesModule } from 'src/roles/roles.module';
import { PermissionsGuard } from 'src/roles/api/permissions.guard';
import { TenantsModule } from 'src/tenants/tenants.module';
import { MembershipGuard } from 'src/tenants/api/membership.guard';
import { StoresModule } from 'src/stores/stores.module';
import { MeController } from './api/me.controller';
import { GetMeUseCase } from './application/get-me.use-case';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    TenantsModule,
    StoresModule,
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
  controllers: [ AuthController, MeController ],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    GetMeUseCase,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    // Order matters: JWT must run first so request.user exists
    {
      provide: APP_GUARD,
      useClass: MembershipGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ],
  exports: [PASSWORD_HASHER]
})
export class AuthModule {}
