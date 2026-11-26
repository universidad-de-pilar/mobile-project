import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from "@nestjs/common";
import { Response } from "express";

// Nest maps multer's LIMIT_FILE_SIZE to a 413 without our error code.
@Catch(PayloadTooLargeException)
export class MediaTooLargeFilter implements ExceptionFilter {
    catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
        host.switchToHttp().getResponse<Response>().status(413).json({
            statusCode: 413,
            message: 'File exceeds the size limit',
            error: 'Payload Too Large',
            code: 'MEDIA_TOO_LARGE',
        });
    }
}
