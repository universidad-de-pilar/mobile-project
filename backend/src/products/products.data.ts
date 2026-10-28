export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  bookstore: string;
};

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cuaderno escolar',
    description: 'Cuaderno rayado para uso escolar.',
    price: 3500,
    stock: 12,
    active: true,
    bookstore: 'Librería EduKit',
  },
  {
    id: '2',
    name: 'Lápices de colores',
    description: 'Caja de lápices de colores.',
    price: 4200,
    stock: 0,
    active: true,
    bookstore: 'Librería EduKit',
  },
  {
    id: '3',
    name: 'Regla escolar',
    description: 'Regla de 20 centímetros.',
    price: 1200,
    stock: 8,
    active: false,
    bookstore: 'Librería EduKit',
  },
];

export function findActiveProducts(): Product[] {
  return PRODUCTS.filter((product) => product.active);
}

export function findActiveProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id && product.active);
}
