import { Module } from '@nestjs/common';
import { cloudinaryEnabled } from 'src/media/cloudinary-media';
import { TenantsModule } from 'src/tenants/tenants.module';
import { ContentController } from './api/content.controller';
import { PlaylistsController } from './api/playlists.controller';
import { CreateContentUseCase } from './application/create-content.use-case';
import { DeleteContentUseCase } from './application/delete-content.use-case';
import { ListContentUseCase } from './application/list-content.use-case';
import {
  CreatePlaylistUseCase, DeletePlaylistUseCase, GetPlaylistDetailUseCase, ListPlaylistScreensUseCase,
  ListPlaylistsUseCase, RenamePlaylistUseCase, SetPlaylistItemsUseCase,
} from './application/playlist.use-cases';
import { CONTENT_STORAGE, VIDEO_PROBE } from './application/ports/content-ports';
import { CONTENT_REPOSITORY } from './domain/content.repository';
import { PLAYLIST_REPOSITORY } from './domain/playlist.repository';
import { FfprobeVideoProbe } from './infraestructure/ffprobe-video-probe';
import { CloudinaryContentStorage } from './infraestructure/cloudinary-content-storage';
import { LocalContentStorage } from './infraestructure/local-content-storage';
import { PostgreContentRepository } from './infraestructure/postgre-content.repository';
import { PostgrePlaylistRepository } from './infraestructure/postgre-playlist.repository';

@Module({
  imports: [TenantsModule],
  controllers: [ContentController, PlaylistsController],
  providers: [
    { provide: CONTENT_REPOSITORY, useClass: PostgreContentRepository },
    { provide: PLAYLIST_REPOSITORY, useClass: PostgrePlaylistRepository },
    {
      provide: CONTENT_STORAGE,
      useFactory: () => (cloudinaryEnabled() ? new CloudinaryContentStorage() : new LocalContentStorage()),
    },
    { provide: VIDEO_PROBE, useClass: FfprobeVideoProbe },
    ListContentUseCase,
    CreateContentUseCase,
    DeleteContentUseCase,
    ListPlaylistsUseCase,
    CreatePlaylistUseCase,
    GetPlaylistDetailUseCase,
    RenamePlaylistUseCase,
    DeletePlaylistUseCase,
    SetPlaylistItemsUseCase,
    ListPlaylistScreensUseCase,
  ],
  exports: [PLAYLIST_REPOSITORY],
})
export class ContentModule {}
