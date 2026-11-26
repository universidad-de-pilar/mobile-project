import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { RequirePermissions } from 'src/roles/api/require-permissions.decorator';
import { CurrentTenant } from 'src/tenants/api/current-tenant.decorator';
import { Tenant } from 'src/tenants/domain/tenant.entity';
import {
  CreatePlaylistUseCase, DeletePlaylistUseCase, GetPlaylistDetailUseCase, ListPlaylistScreensUseCase,
  ListPlaylistsUseCase, RenamePlaylistUseCase, SetPlaylistItemsUseCase,
} from '../application/playlist.use-cases';
import { PlaylistNameDto, SetPlaylistItemsDto } from './dto/content.dto';

@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly listPlaylists: ListPlaylistsUseCase,
    private readonly createPlaylist: CreatePlaylistUseCase,
    private readonly getPlaylist: GetPlaylistDetailUseCase,
    private readonly renamePlaylist: RenamePlaylistUseCase,
    private readonly deletePlaylist: DeletePlaylistUseCase,
    private readonly setItems: SetPlaylistItemsUseCase,
    private readonly listScreens: ListPlaylistScreensUseCase,
  ) {}

  @Get()
  @RequirePermissions('content:read')
  list(@CurrentTenant() tenant: Tenant) {
    return this.listPlaylists.execute(tenant);
  }

  @Post()
  @RequirePermissions('content:create')
  create(@CurrentTenant() tenant: Tenant, @Body() dto: PlaylistNameDto) {
    return this.createPlaylist.execute(tenant, dto.name);
  }

  @Get(':playlistId')
  @RequirePermissions('content:read')
  get(@CurrentTenant() tenant: Tenant, @Param('playlistId', ParseUUIDPipe) playlistId: string) {
    return this.getPlaylist.execute(tenant, playlistId);
  }

  @Patch(':playlistId')
  @RequirePermissions('content:update')
  rename(@CurrentTenant() tenant: Tenant, @Param('playlistId', ParseUUIDPipe) playlistId: string, @Body() dto: PlaylistNameDto) {
    return this.renamePlaylist.execute(tenant, playlistId, dto.name);
  }

  @Delete(':playlistId')
  @HttpCode(204)
  @RequirePermissions('content:delete')
  async remove(@CurrentTenant() tenant: Tenant, @Param('playlistId', ParseUUIDPipe) playlistId: string) {
    await this.deletePlaylist.execute(tenant, playlistId);
  }

  @Put(':playlistId/items')
  @RequirePermissions('content:update')
  replaceItems(@CurrentTenant() tenant: Tenant, @Param('playlistId', ParseUUIDPipe) playlistId: string, @Body() dto: SetPlaylistItemsDto) {
    return this.setItems.execute(tenant, playlistId, dto.items);
  }

  @Get(':playlistId/screens')
  @RequirePermissions('content:read')
  screens(@CurrentTenant() tenant: Tenant, @Param('playlistId', ParseUUIDPipe) playlistId: string) {
    return this.listScreens.execute(tenant, playlistId);
  }
}
