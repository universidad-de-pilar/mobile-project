import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  // A getter in practice: the tenant is resolved after the store is created.
  tenantId: string | null;
}

export const requestStore = new AsyncLocalStorage<RequestStore>();
