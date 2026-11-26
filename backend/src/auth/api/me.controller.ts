import { Controller, Get } from '@nestjs/common';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { GetMeUseCase } from '../application/get-me.use-case';
import { CurrentUserId } from './current-user.decorator';

@Controller('me')
export class MeController {
  constructor(private readonly getMe: GetMeUseCase) {}

  @Get()
  me(@CurrentTenant() tenant: Tenant | undefined, @CurrentUserId() userId: string) {
    return this.getMe.execute(tenant, userId);
  }
}
