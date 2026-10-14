import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SERVER_PORT: z.coerce.number().int().positive().default(2567),
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SERVER_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  SERVER_ROOM_RECONNECT_TIMEOUT_SEC: z.coerce.number().int().positive().default(10),
  SERVER_ROOM_EMPTY_TIMEOUT_SEC: z.coerce.number().int().positive().default(30),
  SERVER_RATE_LIMIT_JOIN_MAX: z.coerce.number().int().positive().default(10),
  SERVER_RATE_LIMIT_JOIN_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(): ServerEnv {
  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid server environment configuration:', result.error.format());
    throw new Error('Server environment configuration failed validation');
  }
  return result.data;
}

export const serverEnv = loadServerEnv();
