import { ApiError } from '@/lib/api';

const MB = 1024 * 1024;
const LIMITS = { image: 5 * MB, video: 50 * MB };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BAD_TYPE = 'Elegí una imagen o un video MP4.';
const OFFLINE = 'No se pudo conectar con el servidor.';

export const DEFAULT_IMAGE_SECONDS = 10;

export type MediaKind = 'image' | 'video';

export function checkMedia(asset: { mimeType?: string | null; fileSize?: number }): {
  kind: MediaKind | null;
  error: string | null;
} {
  const kind: MediaKind | null = IMAGE_TYPES.includes(asset.mimeType ?? '')
    ? 'image'
    : asset.mimeType === 'video/mp4'
      ? 'video'
      : null;
  if (!kind) return { kind, error: BAD_TYPE };
  if (asset.fileSize !== undefined && asset.fileSize > LIMITS[kind]) {
    return { kind, error: kind === 'image' ? 'La imagen supera el límite de 5 MB.' : 'El video supera el límite de 50 MB.' };
  }
  return { kind, error: null };
}

/** Body of `PUT /playlists/:id/items`: videos keep their real length and must not send one. */
export const itemsPayload = (items: { media_id: string; type: MediaKind; duration_seconds: number }[]) =>
  items.map((i) => (i.type === 'video' ? { media_id: i.media_id } : { media_id: i.media_id, duration_seconds: i.duration_seconds }));

/** Returns a new list with the item at `index` swapped with its neighbour; ends are a no-op. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type Row = { type: MediaKind; original_name: string; duration_seconds: number | null };

export const contentSubtitle = (item: Row) =>
  (item.type === 'image' ? 'Imagen' : 'Video') + (item.duration_seconds === null ? '' : ` · ${item.duration_seconds} s`);

export function contentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'VIDEO_TOO_LONG') return 'El video dura más de 60 segundos.';
    if (error.code === 'MEDIA_TOO_LARGE') return 'El archivo supera el límite de tamaño.';
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') return BAD_TYPE;
    if (error.code === 'MEDIA_UNREADABLE') return 'No se pudo leer el archivo. Probá con otro.';
    if (error.code === 'MEDIA_IN_USE') return 'Está en uso en una lista; quitalo de la lista primero.';
    if (error.code === 'MEDIA_NOT_FOUND') return 'El medio ya no existe.';
    if (error.code === 'PLAYLIST_NOT_FOUND') return 'La lista ya no existe.';
    if (error.code === 'DURATION_REQUIRED') return 'Cada imagen necesita su duración (3 a 60 s).';
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return OFFLINE;
  }
  return 'No se pudo completar la acción.';
}

export function screenErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'No tenés permiso para esta acción.';
    if (error.status === 0) return OFFLINE;
  }
  return 'No se pudo crear la pantalla.';
}

export function validateScreenName(name: string): string | null {
  const n = name.trim();
  if (!n) return 'Ingresá el nombre.';
  return n.length > 80 ? 'El nombre admite hasta 80 caracteres.' : null;
}
