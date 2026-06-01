import { getStatus } from '../../../shared/store.js';
import type { StatusResponse } from '../../../shared/types.js';

export function getPaymentStatus(orderId: string): StatusResponse | undefined {
  const status = getStatus(orderId);
  if (!status) return undefined;
  return { orderId, status };
}
