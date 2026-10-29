

import {

  createContext,

  useContext,

  useMemo,

  useState,

  type ReactNode,

} from 'react';



import type { Product } from '@/lib/products';



export type CartItem = {

  product: Product;

  quantity: number;

};



type CartContextValue = {

  items: CartItem[];

  addItem: (product: Product) => void;

  updateQuantity: (productId: string, quantity: number) => void;

  removeItem: (productId: string) => void;

  clearCart: () => void;

  total: number;

  itemCount: number;

};



const CartContext = createContext<CartContextValue | undefined>(undefined);



export function CartProvider({ children }: { children: ReactNode }) {

  const [items, setItems] = useState<CartItem[]>([]);



  const addItem = (product: Product) => {

    if (!product.active || product.stock < 1) return;



    setItems((current) => {

      const existing = current.find(

        (item) => item.product.id === product.id,

      );



      if (existing) {

        if (existing.quantity >= Math.min(product.stock, 50)) {

          return current;

        }



        return current.map((item) =>

          item.product.id === product.id

            ? {

                ...item,

                quantity: item.quantity + 1,

                product,

              }

            : item,

        );

      }



      return [...current, { product, quantity: 1 }];

    });

  };





  const updateQuantity = (productId: string, quantity: number) => {

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {

      return;

    }



    setItems((current) =>

      current.map((item) =>

        item.product.id === productId &&

        quantity <= item.product.stock

          ? { ...item, quantity }

          : item,

      ),

    );

  };



  const removeItem = (productId: string) => {

    setItems((current) =>

      current.filter((item) => item.product.id !== productId),

    );

  };



  const clearCart = () => setItems([]);



  const total = items.reduce(

    (sum, item) => sum + item.product.price * item.quantity,

    0,

  );



  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);



  const value = useMemo(

    () => ({

      items,

      addItem,

      updateQuantity,

      removeItem,

      clearCart,

      total,

      itemCount,

    }),

    [items, total, itemCount],

  );



  return (

    <CartContext.Provider value={value}>

      {children}

    </CartContext.Provider>

  );

}



export function useCart() {

  const context = useContext(CartContext);



  if (!context) {

    throw new Error('useCart debe utilizarse dentro de CartProvider');

  }



  return context;

}
