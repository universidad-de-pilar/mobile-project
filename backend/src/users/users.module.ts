import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/user.repository';
import { PostgreUserRepository } from './infraestructure/posgre-user.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
        provide: USER_REPOSITORY,
        useClass: PostgreUserRepository
    }
  ],
  exports:[USER_REPOSITORY]
})
export class UsersModule {}
