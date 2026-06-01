import { generateKhqr } from '../infrastructure/khqr-adapter.js';
import { setStatus } from '../../../shared/store.js';
import type { GenerateKhqrBody, GenerateKhqrResponse } from '../../../shared/types.js';

export function generatePayment(input: GenerateKhqrBody): GenerateKhqrResponse {
  const result = generateKhqr(input.projectPrefix, input.amount);
  setStatus(result.orderId, 'PENDING');
  return result;
}
