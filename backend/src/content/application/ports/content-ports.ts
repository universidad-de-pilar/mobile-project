export const CONTENT_STORAGE = Symbol('CONTENT_STORAGE');
export const VIDEO_PROBE = Symbol('VIDEO_PROBE');

export interface IContentStorage {
    // Stores the bytes untouched; returns the path relative to the uploads dir.
    save(tenantId: string, buffer: Buffer, ext: string): Promise<string>;
    // Missing files are ignored.
    remove(filePath: string): Promise<void>;
}

export interface IVideoProbe {
    // Duration in seconds, rounded up, of a video. Rejects if it cannot be read.
    durationSeconds(video: Buffer): Promise<number>;
}
