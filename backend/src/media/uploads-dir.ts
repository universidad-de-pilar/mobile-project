import { resolve } from 'node:path';

export const uploadsDir = () => resolve(process.env.UPLOADS_DIR ?? './uploads');
