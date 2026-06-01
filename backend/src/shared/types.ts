import { z } from 'zod';

/** Canonical tenant prefixes. `config.ts` derives PROJECT_ROUTES from these. */
export const PROJECT_PREFIXES = ['AGENT', 'DIAG', 'LOCAL'] as const;

export const ORDER_STATUSES = ['PENDING', 'PAID'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Inbound: validated body of POST /api/generate-khqr. */
export const generateKhqrBodySchema = z.object({
  projectPrefix: z.enum(PROJECT_PREFIXES),
  amount: z.number().positive(),
});
export type GenerateKhqrBody = z.infer<typeof generateKhqrBodySchema>;

/** Outbound: response of POST /api/generate-khqr. */
export interface GenerateKhqrResponse {
  orderId: string;
  qrString: string;
}

/** Outbound: response of GET /api/status/:orderId. */
export interface StatusResponse {
  orderId: string;
  status: OrderStatus;
}

/** Outbound: webhook body POSTed to the tenant. */
export interface WebhookPayload {
  orderId: string;
  amount: number;
  secureToken: string;
}
