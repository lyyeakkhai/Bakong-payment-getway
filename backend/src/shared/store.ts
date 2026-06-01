import type { OrderStatus } from './types.js';

/** The single in-memory state seam shared by the API and the bot. */
const store = new Map<string, OrderStatus>();

export function setStatus(orderId: string, status: OrderStatus): void {
  store.set(orderId, status);
}

export function getStatus(orderId: string): OrderStatus | undefined {
  return store.get(orderId);
}
