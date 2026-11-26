import { BadRequestException, ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";

export const productNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Product not found', error: 'Not Found', code: 'PRODUCT_NOT_FOUND' });

export const categoryNotFound = () =>
    new NotFoundException({ statusCode: 404, message: 'Category not found', error: 'Not Found', code: 'CATEGORY_NOT_FOUND' });

// The DTO regex accepts "0" and "0.00"; the price must be strictly positive.
export const assertPositivePrice = (price: string) => {
    if (!(Number(price) > 0)) {
        throw new BadRequestException({ statusCode: 400, message: 'price must be greater than 0', error: 'Bad Request' });
    }
};

export const unsupportedMediaType = () =>
    new HttpException(
        { statusCode: 415, message: 'Only JPG, PNG or WebP images are allowed', error: 'Unsupported Media Type', code: 'UNSUPPORTED_MEDIA_TYPE' },
        415,
    );

export const mediaUnreadable = () =>
    new UnprocessableEntityException({ statusCode: 422, message: 'The image could not be read', error: 'Unprocessable Entity', code: 'MEDIA_UNREADABLE' });

export const skuAlreadyExists = () =>
    new ConflictException({ statusCode: 409, message: 'SKU already exists in this tenant', error: 'Conflict', code: 'SKU_ALREADY_EXISTS' });

export const skuRequired = () =>
    new BadRequestException({ statusCode: 400, message: 'sku is required', error: 'Bad Request', code: 'SKU_REQUIRED' });
