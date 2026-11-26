import { ConflictException, NotFoundException } from "@nestjs/common";

export interface UnavailableProduct { product_id: string; name?: string; reason: 'unavailable' | 'not_found' }

export const storeNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Store not found', error: 'Not Found', code: 'STORE_NOT_FOUND' });

export const productsUnavailable = (details: UnavailableProduct[]) =>
    new ConflictException({
        statusCode: 409, message: 'Hay productos que ya no están disponibles', error: 'Conflict', code: 'PRODUCTS_UNAVAILABLE', details,
    });

export const orderNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Order not found', error: 'Not Found', code: 'ORDER_NOT_FOUND' });

export const invalidStatusTransition = (from: string, to: string, allowed: string[]) =>
    new ConflictException({
        statusCode: 409, message: 'Transición de estado no permitida', error: 'Conflict', code: 'INVALID_STATUS_TRANSITION',
        details: { from, to, allowed },
    });
