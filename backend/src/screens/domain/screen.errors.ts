import { BadRequestException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";

export const storeNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Store not found', error: 'Not Found', code: 'STORE_NOT_FOUND' });

export const screenNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Screen not found', error: 'Not Found', code: 'SCREEN_NOT_FOUND' });

export const pairingNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Pairing not found or expired', error: 'Not Found', code: 'PAIRING_NOT_FOUND' });

export const pairingCodeInvalid = () =>
    new NotFoundException({ statusCode: 404, message: 'Pairing code invalid, expired or already used', error: 'Not Found', code: 'PAIRING_CODE_INVALID' });

export const emptyUpdate = () =>
    new BadRequestException({ statusCode: 400, message: 'Send at least one field to update', error: 'Bad Request', code: 'EMPTY_UPDATE' });

export const invalidSlot = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'Each slot needs days 1-127 and an end time after its start time', error: 'Unprocessable Entity', code: 'INVALID_SLOT' });

export const slotOverlap = (slots: [number, number]) =>
    new UnprocessableEntityException({ statusCode: 422, message: 'Slots of the same screen cannot overlap', error: 'Unprocessable Entity', code: 'SLOT_OVERLAP', details: { slots } });
