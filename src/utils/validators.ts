import { z } from 'zod';

const CONTROL_OR_DANGEROUS = /[\u0000-\u001F\u007F<>]/;

/** Trim, NFC-normalise, and reject control chars / null bytes / angle brackets. */
export const safeText = (field = 'value') =>
  z
    .string({ error: `${field} must be a string` })
    .transform((value) => value.normalize('NFC').trim())
    .refine((value) => value.length > 0, { error: `${field} must not be empty` })
    .refine((value) => !CONTROL_OR_DANGEROUS.test(value), {
      error: `${field} contains disallowed characters`,
    });

const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}\s'-]*$/u;

/** Safe text plus a reasonable personal-name pattern. */
export const personName = (field = 'name') =>
  safeText(field).refine((value) => PERSON_NAME_PATTERN.test(value) && value.length <= 100, {
    error: `${field} must be a valid person name`,
  });

/** Coerce route/query ids to a positive integer. */
export const idParam = z.coerce.number().int().positive();

/** Shared limit/offset query shape. Unknown keys should be stripped by the caller schema. */
export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Lowercase slug: letters, digits, hyphens (e.g. maths, english). */
export const tag = z
  .string({ error: 'tag must be a string' })
  .transform((value) => value.normalize('NFC').trim().toLowerCase())
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    error: 'tag must be a lowercase slug (a-z, 0-9, hyphen)',
  })
  .refine((value) => value.length >= 1 && value.length <= 50, {
    error: 'tag must be between 1 and 50 characters',
  });

/** Escape `%` and `_` so user search terms are literal in ILIKE patterns. */
export const escapeLike = (str: string): string => str.replace(/[%_\\]/g, (ch) => `\\${ch}`);
