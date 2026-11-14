import { AuthModule } from './auth/auth.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { ScreensModule } from './screens/screens.module';
import { StoresModule } from './stores/stores.module';
import { ContentModule } from './content/content.module';
import { EmployeesModule } from './employees/employees.module';
import { TenantMiddleware } from './tenants/api/tenant.middleware';
import { logger } from './logging/app-logger';
import { TypeOrmLogger } from './logging/typeorm-logger';
import { dbSsl } from './db/db-ssl';

@Module({
  imports: [ 
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        ssl: dbSsl(config.get<string>('DB_CA_CERT')),
        autoLoadEntities: true, //registra entidades de los modulos
        synchronize: false, //nunca en prod
        logging: config.get<string>('DB_LOGGING') === 'true',
        logger: new TypeOrmLogger(logger),
        retryAttempts: 5,
        retryDelay: 3000,
      })
    }),
    AuthModule, 
    UsersModule,
    TenantsModule,
    RolesModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    ScreensModule,
    StoresModule,
    ContentModule,
    EmployeesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
