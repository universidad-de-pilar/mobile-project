import { ApiError } from './api';
import {
  checkMedia,
  contentErrorMessage,
  contentSubtitle,
  itemsPayload,
  moveItem,
  screenErrorMessage,
  validateScreenName,
} from './content-rules';

const MB = 1024 * 1024;

describe('checkMedia', () => {
  it('accepts images up to exactly 5 MB and videos up to exactly 50 MB', () => {
    expect(checkMedia({ mimeType: 'image/jpeg', fileSize: 5 * MB })).toEqual({ kind: 'image', error: null });
    expect(checkMedia({ mimeType: 'image/webp', fileSize: 1 })).toEqual({ kind: 'image', error: null });
    expect(checkMedia({ mimeType: 'video/mp4', fileSize: 50 * MB })).toEqual({ kind: 'video', error: null });
  });
  it('rejects bigger files with the limit of their kind', () => {
    expect(checkMedia({ mimeType: 'image/png', fileSize: 5 * MB + 1 }).error).toBe('La imagen supera el límite de 5 MB.');
    expect(checkMedia({ mimeType: 'video/mp4', fileSize: 50 * MB + 1 }).error).toBe('El video supera el límite de 50 MB.');
  });
  it('rejects other types', () => {
    expect(checkMedia({ mimeType: 'video/quicktime', fileSize: 1 }).error).toBe('Elegí una imagen o un video MP4.');
    expect(checkMedia({ mimeType: null, fileSize: 1 }).error).toBe('Elegí una imagen o un video MP4.');
  });
  it('lets an unknown size through for the server to judge', () => {
    expect(checkMedia({ mimeType: 'video/mp4', fileSize: undefined }).error).toBeNull();
  });
});

describe('moveItem', () => {
  const ids = ['a', 'b', 'c'];
  it('moves up and down returning the full list', () => {
    expect(moveItem(ids, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(ids, 1, 1)).toEqual(['a', 'c', 'b']);
  });
  it('does not mutate and ignores moves past the ends', () => {
    expect(moveItem(ids, 0, -1)).toEqual(ids);
    expect(moveItem(ids, 2, 1)).toEqual(ids);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('row text', () => {
  const image = { type: 'image' as const, original_name: 'promo 2x1.jpg', duration_seconds: 10 };
  const video = { type: 'video' as const, original_name: 'combo.familiar.mp4', duration_seconds: 30 };
  it('shows kind and seconds when there are any', () => {
    expect(contentSubtitle(image)).toBe('Imagen · 10 s');
    expect(contentSubtitle(video)).toBe('Video · 30 s');
    expect(contentSubtitle({ type: 'image', original_name: 'a.jpg', duration_seconds: null })).toBe('Imagen');
  });
});

describe('contentErrorMessage', () => {
  it('maps server codes', () => {
    expect(contentErrorMessage(new ApiError(422, 'VIDEO_TOO_LONG', 'x'))).toBe('El video dura más de 60 segundos.');
    expect(contentErrorMessage(new ApiError(413, 'MEDIA_TOO_LARGE', 'x'))).toBe('El archivo supera el límite de tamaño.');
    expect(contentErrorMessage(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'x'))).toBe('Elegí una imagen o un video MP4.');
    expect(contentErrorMessage(new ApiError(422, 'MEDIA_UNREADABLE', 'x'))).toBe('No se pudo leer el archivo. Probá con otro.');
    expect(contentErrorMessage(new ApiError(409, 'MEDIA_IN_USE', 'x'))).toBe(
      'Está en uso en una lista; quitalo de la lista primero.',
    );
    expect(contentErrorMessage(new ApiError(404, 'MEDIA_NOT_FOUND', 'x'))).toBe('El medio ya no existe.');
    expect(contentErrorMessage(new ApiError(404, 'PLAYLIST_NOT_FOUND', 'x'))).toBe('La lista ya no existe.');
    expect(contentErrorMessage(new ApiError(422, 'DURATION_REQUIRED', 'x'))).toBe('Cada imagen necesita su duración (3 a 60 s).');
    expect(contentErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para esta acción.');
    expect(contentErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(contentErrorMessage(new Error('x'))).toBe('No se pudo completar la acción.');
  });
});

describe('screens', () => {
  it('validates the name from 1 to 80 characters', () => {
    expect(validateScreenName('  ')).toBe('Ingresá el nombre.');
    expect(validateScreenName('a'.repeat(81))).toBe('El nombre admite hasta 80 caracteres.');
    expect(validateScreenName(' Entrada ')).toBeNull();
  });
  it('maps create errors', () => {
    expect(screenErrorMessage(new ApiError(403, null, 'x'))).toBe('No tenés permiso para esta acción.');
    expect(screenErrorMessage(new ApiError(0, null, 'x'))).toBe('No se pudo conectar con el servidor.');
    expect(screenErrorMessage(new Error('x'))).toBe('No se pudo crear la pantalla.');
  });
});

describe('itemsPayload', () => {
  it('sends the duration for images only', () => {
    expect(
      itemsPayload([
        { media_id: 'a', type: 'image', duration_seconds: 8 },
        { media_id: 'b', type: 'video', duration_seconds: 20 },
      ]),
    ).toEqual([{ media_id: 'a', duration_seconds: 8 }, { media_id: 'b' }]);
  });
});
