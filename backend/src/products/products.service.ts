import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findActiveProductById,
  findActiveProducts,
} from './products.data';

@Injectable()
export class ProductsService {
  findAll() {
    return findActiveProducts();
  }

  findOne(id: string) {
    const product = findActiveProductById(id);

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }
}
