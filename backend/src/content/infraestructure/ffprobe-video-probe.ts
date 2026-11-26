import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { IVideoProbe } from "../application/ports/content-ports";

const run = promisify(execFile);

@Injectable()
export class FfprobeVideoProbe implements IVideoProbe {

    async durationSeconds(video: Buffer): Promise<number> {
        const file = join(tmpdir(), `probe-${randomUUID()}.mp4`);
        await writeFile(file, video);
        try {
            const { stdout } = await run(
                'ffprobe',
                ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
                { timeout: 15_000 },
            );
            return Math.ceil(Number(stdout.trim()));
        } finally {
            await rm(file, { force: true });
        }
    }
}
