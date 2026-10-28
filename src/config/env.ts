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

/** Exact message asserted by tests/config.test.ts */
export const CORS_WILDCARD_MESSAGE =
  'CORS_ORIGINS cannot be "*" — allowing every origin lets any website read authenticated responses from a logged-in browser. List explicit origins instead (e.g. https://app.example.com).';

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const corsOriginsSchema = requiredString('CORS_ORIGINS')
  .min(1, { error: 'CORS_ORIGINS is required but missing' })
  .transform((value) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  )
  .superRefine((origins, ctx) => {
    if (origins.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'CORS_ORIGINS must list at least one origin' });
      return;
    }
    if (origins.includes('*')) {
      ctx.addIssue({ code: 'custom', message: CORS_WILDCARD_MESSAGE });
      return;
    }
    for (const origin of origins) {
      if (!isAbsoluteHttpUrl(origin)) {
        ctx.addIssue({
          code: 'custom',
          message: `CORS_ORIGINS entry "${origin}" must be a full URL (e.g. http://localhost:3000)`,
        });
      }
    }
  });

export const envSchema = z.object({
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
  JWT_SECRET: requiredString('JWT_SECRET').min(32, {
    error: 'JWT_SECRET must be at least 32 characters',
  }),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  CORS_ORIGINS: corsOriginsSchema,
  MARKS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

/** Parse without exiting — used by tests and validateConfig. */
export const parseEnv = (raw: NodeJS.ProcessEnv = process.env) => envSchema.safeParse(raw);

/** Check .env values. If something is wrong, print it and exit. */
export const validateConfig = (): Env => {
  const result = parseEnv();
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
