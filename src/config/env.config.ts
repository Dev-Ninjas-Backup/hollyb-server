import { z } from 'zod';

export const validationSchema = z
    .object({
        NODE_ENV: z
            .enum(['development', 'production'])
            .default('development'),
        PORT: z.coerce.number().default(3000),
        DATABASE_URL: z.string().url()
    })
    .passthrough();