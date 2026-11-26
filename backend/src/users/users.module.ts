import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './domain/user.repository';
import { PostgreUserRepository } from './infraestructure/postgre-user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infraestructure/user.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
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
