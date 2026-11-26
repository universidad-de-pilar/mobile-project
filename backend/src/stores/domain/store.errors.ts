import { BadRequestException, NotFoundException } from "@nestjs/common";

export const storeNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Store not found', error: 'Not Found', code: 'STORE_NOT_FOUND' });

export const emptyUpdate = () =>
    new BadRequestException({ statusCode: 400, message: 'Send at least one field to update', error: 'Bad Request', code: 'EMPTY_UPDATE' });
