import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

export const employeeNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Employee not found in this tenant', error: 'Not Found', code: 'EMPLOYEE_NOT_FOUND' });

export const employeeNotEditable = () =>
    new ForbiddenException({ statusCode: 403, message: 'Only employees can be edited', error: 'Forbidden', code: 'EMPLOYEE_NOT_EDITABLE' });

export const cannotDeactivateSelf = () =>
    new ConflictException({ statusCode: 409, message: 'You cannot deactivate yourself', error: 'Conflict', code: 'CANNOT_DEACTIVATE_SELF' });

export const emailTaken = () =>
    new ConflictException({ statusCode: 409, message: 'Email already registered', error: 'Conflict', code: 'EMAIL_TAKEN' });

export const invalidStores = () =>
    new BadRequestException({ statusCode: 400, message: 'Stores are required and must be active stores of the tenant', error: 'Bad Request', code: 'INVALID_STORES' });
