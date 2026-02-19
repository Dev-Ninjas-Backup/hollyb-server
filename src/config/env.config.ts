import { z } from 'zod';

export const validationSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production']).default('production'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(8),
    JWT_ACCESS_EXPIRES_IN: z.string(),
    JWT_REFRESH_EXPIRES_IN: z.string(),
    OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_EMAIL: z.string().email(),
    FIREBASE_PRIVATE_KEY: z.string().min(1),
    ACCESS_KEY: z.string().min(1),
    ACCESS_SECRET: z.string().min(1),
    BUCKET_NAME: z.string().min(1),
    BUCKET_REGION: z.string().min(1),
    UPLOAD_DIR: z.string().min(1),
  })
  .passthrough();
