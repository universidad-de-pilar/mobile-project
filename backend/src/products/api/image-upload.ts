import { IMAGE_MAX_BYTES } from "../domain/product-image";

export const IMAGE_UPLOAD_OPTIONS = { limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } };
