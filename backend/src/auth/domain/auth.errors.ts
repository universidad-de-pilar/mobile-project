import { ForbiddenException } from "@nestjs/common";

export const adminAlreadyExists = () =>
    new ForbiddenException({ statusCode: 403, message: 'The platform admin already exists', error: 'Forbidden', code: 'ADMIN_ALREADY_EXISTS' });
