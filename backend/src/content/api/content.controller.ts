import {
  BadRequestException, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UploadedFile, UseFilters, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaTooLargeFilter } from 'src/products/api/media-too-large.filter';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import { CreateContentUseCase } from '../application/create-content.use-case';
import { DeleteContentUseCase } from '../application/delete-content.use-case';
import { ListContentUseCase } from '../application/list-content.use-case';
import { VIDEO_MAX_BYTES } from '../domain/content-media';

// Multer cap is the video limit; the use case enforces the lower image limit.
const CONTENT_UPLOAD_OPTIONS = { limits: { fileSize: VIDEO_MAX_BYTES, files: 1 } };

@Controller('content')
export class ContentController {
  constructor(
    private readonly listContent: ListContentUseCase,
    private readonly createContent: CreateContentUseCase,
    private readonly deleteContent: DeleteContentUseCase,
  ) {}

  @Get()
  @RequirePermissions('content:read')
  list(@CurrentTenant() tenant: Tenant) {
    return this.listContent.execute(tenant);
  }

  @Post()
  @RequirePermissions('content:create')
  @UseInterceptors(FileInterceptor('file', CONTENT_UPLOAD_OPTIONS))
  @UseFilters(MediaTooLargeFilter)
  create(@CurrentTenant() tenant: Tenant, @UploadedFile() file?: { buffer: Buffer; originalname: string }) {
    if (!file) {
      throw new BadRequestException({ statusCode: 400, message: 'file is required', error: 'Bad Request' });
    }
    // Multer decodes the multipart filename as latin1.
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.createContent.execute(tenant, { file: file.buffer, original_name: originalName });
  }

  @Delete(':mediaId')
  @HttpCode(204)
  @RequirePermissions('content:delete')
  async remove(@CurrentTenant() tenant: Tenant, @Param('mediaId', ParseUUIDPipe) mediaId: string) {
    await this.deleteContent.execute(tenant, mediaId);
  }
}
