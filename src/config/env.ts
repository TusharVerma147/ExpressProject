import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const requiredString = (name: string) =>
  z.string({
    error: (iss) =>
      iss.input === undefined || iss.input === ''
        ? `${name} is required but missing`
        : `${name} must be a string`,
  });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('express_db_connection'),
  PASS_PERCENTAGE: requiredString('PASS_PERCENTAGE')
    .min(1, { error: 'PASS_PERCENTAGE is required but missing' })
    .refine((value) => value.trim() !== '' && !Number.isNaN(Number(value)), {
      error: 'PASS_PERCENTAGE must be a valid number (e.g. "33.5"), not a non-numeric value',
    })
    .transform((value) => Number(value))
    .pipe(
      z
        .number({ error: 'PASS_PERCENTAGE must be a valid number' })
        .min(0, { error: 'PASS_PERCENTAGE must be between 0 and 100' })
        .max(100, { error: 'PASS_PERCENTAGE must be between 0 and 100' }),
    ),
  ACADEMIC_YEAR: requiredString('ACADEMIC_YEAR')
    .min(1, { error: 'ACADEMIC_YEAR is required but missing' })
    .regex(/^\d{4}-\d{2}$/, {
      error: 'ACADEMIC_YEAR must match YYYY-YY format (e.g. "2026-27")',
    })
    .refine(
      (value) => {
        const [firstPart, secondPart] = value.split('-') as [string, string];
        const firstYear = Number(firstPart);
        const secondYear = Number(secondPart);
        return secondYear === (firstYear + 1) % 100;
      },
      {
        error: (iss) =>
          `ACADEMIC_YEAR: second year must follow the first (received "${String(iss.input)}")`,
      },
    ),
});

export type Env = z.infer<typeof envSchema>;

/** Check .env values. If something is wrong, print it and exit. */
export const validateConfig = (): Env => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'config';
    const message = issue?.message ?? 'Invalid configuration';
    console.error(`Configuration error [${path}]: ${message}`);
    process.exit(1);
  }
  return result.data;
};

export const env = validateConfig();

export const isProduction = env.NODE_ENV === 'production';
