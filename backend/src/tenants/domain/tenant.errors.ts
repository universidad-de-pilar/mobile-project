import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";

export const tenantNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Tenant not found', error: 'Not Found', code: 'TENANT_NOT_FOUND' });

export const userNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'The owner must register first', error: 'Not Found', code: 'USER_NOT_FOUND' });

export const invalidSlug = () =>
    new BadRequestException({ statusCode: 400, message: 'Slug is invalid or reserved', error: 'Bad Request', code: 'INVALID_SLUG' });

export const slugTaken = () =>
    new ConflictException({ statusCode: 409, message: 'Slug already in use', error: 'Conflict', code: 'SLUG_TAKEN' });

export const tenantSuspended = () =>
    new ServiceUnavailableException({ statusCode: 503, message: 'Tenant suspended for maintenance', error: 'Service Unavailable', code: 'TENANT_SUSPENDED' });
