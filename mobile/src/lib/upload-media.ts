import * as ImagePicker from 'expo-image-picker';

import { uploadMedia, type Media } from '@/lib/admin-api';
import { checkMedia, contentErrorMessage } from '@/lib/content-rules';

/** A problem with the chosen file, already worded for the user. */
export class PickError extends Error {}

/** Opens the picker and uploads the choice; null when the user cancels. */
export async function pickAndUpload(): Promise<Media | null> {
  // On web the picker rejects unsupported files by throwing.
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'] }).catch(() => null);
  if (!picked) throw new PickError('Elegí una imagen o un video MP4.');
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const check = checkMedia({ mimeType: asset.mimeType ?? asset.file?.type, fileSize: asset.fileSize ?? asset.file?.size });
  if (check.error) throw new PickError(check.error);
  return uploadMedia(asset);
}

export const uploadErrorMessage = (e: unknown) => (e instanceof PickError ? e.message : contentErrorMessage(e));
