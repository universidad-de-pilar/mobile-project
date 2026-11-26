import { BadRequestException, ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";

export const mediaNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Media not found', error: 'Not Found', code: 'MEDIA_NOT_FOUND' });

export const playlistNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Playlist not found', error: 'Not Found', code: 'PLAYLIST_NOT_FOUND' });

export const mediaInUse = () =>
    new ConflictException({ statusCode: 409, message: 'The media is used in a playlist', error: 'Conflict', code: 'MEDIA_IN_USE' });

export const emptyUpdate = () =>
    new BadRequestException({ statusCode: 400, message: 'Send at least one field to update', error: 'Bad Request', code: 'EMPTY_UPDATE' });

export const unsupportedMediaType = () =>
    new HttpException(
        { statusCode: 415, message: 'Only JPG, PNG, WebP images or MP4 videos are allowed', error: 'Unsupported Media Type', code: 'UNSUPPORTED_MEDIA_TYPE' },
        415,
    );

export const mediaTooLarge = (limit: string) =>
    new HttpException(
        { statusCode: 413, message: `File exceeds the ${limit} limit`, error: 'Payload Too Large', code: 'MEDIA_TOO_LARGE' },
        413,
    );

export const mediaUnreadable = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'The file could not be read', error: 'Unprocessable Entity', code: 'MEDIA_UNREADABLE' });

export const videoTooLong = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'The video exceeds 60 seconds', error: 'Unprocessable Entity', code: 'VIDEO_TOO_LONG' });

export const durationNotAllowed = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'duration_seconds applies to images only', error: 'Unprocessable Entity', code: 'DURATION_NOT_ALLOWED' });

export const durationRequired = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'duration_seconds is required for images', error: 'Unprocessable Entity', code: 'DURATION_REQUIRED' });
