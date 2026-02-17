import { z } from 'zod';

export const validationSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(8).default('access-secret-key'),
    JWT_REFRESH_SECRET: z.string().min(8).default('refresh-secret-key'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  })
  .passthrough();
