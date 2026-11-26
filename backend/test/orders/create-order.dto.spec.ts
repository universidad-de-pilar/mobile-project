import { ValidationPipe } from '@nestjs/common';
import { CreateOrderDto } from 'src/orders/api/dto/create-order.dto';

// Same options as src/main.ts.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const validate = (body: object) =>
  pipe.transform(body, { type: 'body', metatype: CreateOrderDto }) as Promise<CreateOrderDto>;

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = (n: number, quantity = 1) => ({ product_id: id(n), quantity });

describe('CreateOrderDto', () => {
  it.each([1, 50])('debe aceptar cantidad %i', async (quantity) => {
    await expect(validate({ items: [item(1, quantity)] })).resolves.toBeDefined();
  });

  it.each([0, 51, -1, 1.5, '2x'])('debe rechazar cantidad %p', async (quantity) => {
    await expect(validate({ items: [item(1, quantity as number)] })).rejects.toMatchObject({ status: 400 });
  });

  it('debe rechazar items vacio o de mas de 50 lineas', async () => {
    await expect(validate({ items: [] })).rejects.toMatchObject({ status: 400 });
    await expect(validate({ items: Array.from({ length: 51 }, (_, i) => item(i + 1)) })).rejects.toMatchObject({ status: 400 });
    await expect(validate({ items: Array.from({ length: 50 }, (_, i) => item(i + 1)) })).resolves.toBeDefined();
  });

  it('debe rechazar el mismo producto repetido y product_id que no es uuid', async () => {
    await expect(validate({ items: [item(1), item(1)] })).rejects.toMatchObject({ status: 400 });
    await expect(validate({ items: [{ product_id: 'p1', quantity: 1 }] })).rejects.toMatchObject({ status: 400 });
  });

  it('debe descartar precios y totales enviados por el cliente', async () => {
    const dto: any = await validate({ total: '1', items: [{ ...item(1, 2), price: '1', unit_price: '1' }] });

    expect(dto).not.toHaveProperty('total');
    expect(dto.items[0]).toEqual({ product_id: id(1), quantity: 2 });
  });
});
