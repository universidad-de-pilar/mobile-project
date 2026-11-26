import { invalidStatusTransition } from './order.errors';

export const ORDER_STATUSES = ['generada', 'en_preparacion', 'lista', 'entregada', 'cancelada'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    generada: ['en_preparacion', 'cancelada'],
    en_preparacion: ['lista', 'cancelada'],
    lista: ['entregada', 'cancelada'],
    entregada: [],
    cancelada: [],
};

export const allowedTransitions = (from: OrderStatus): OrderStatus[] => TRANSITIONS[from];

export const assertTransition = (from: OrderStatus, to: OrderStatus): void => {
    const allowed = allowedTransitions(from);
    if (!allowed.includes(to)) throw invalidStatusTransition(from, to, allowed);
};
