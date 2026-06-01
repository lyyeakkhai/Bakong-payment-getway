import 'dotenv/config';
import { z } from 'zod';
import { PROJECT_PREFIXES } from './types.js';

/** Multi-tenant routing. Adding a tenant is a one-line change. */
export const PROJECT_ROUTES: Record<(typeof PROJECT_PREFIXES)[number], string> = {
  AGENT: 'https://api.agentdoc.ai/v1/payments/fulfill',
  DIAG: 'https://api.diagramapp.com/api/payment/success',
  LOCAL: 'http://localhost:3002/api/payment/webhook',
};

export type ProjectPrefix = keyof typeof PROJECT_ROUTES;

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  BAKONG_ACCOUNT_ID: z.string().min(1),
  MERCHANT_NAME: z.string().min(1),
  SHARED_WEBHOOK_SECRET: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type AppConfig = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): AppConfig {
  return envSchema.parse(source);
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
