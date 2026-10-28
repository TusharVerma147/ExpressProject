import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { isAppError } from '../errors/APIError';

export interface ValidationDetail {
  path: string;
  message: string;
}

/** Map Zod issues to dotted paths tests can assert on (`guardian.phone`, `marks.2.score`). */
export const zodDetails = (err: ZodError): ValidationDetail[] =>
  err.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));

/**
 * The single place errors become HTTP responses. Express identifies it as an
 * error handler because it takes FOUR arguments.
 *
 * Express 5 forwards rejected promises from async handlers here automatically,
 * so controllers don't need try/catch.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: zodDetails(err) },
    });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Malformed JSON body' } });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: isProduction ? 'Internal Server Error' : (err as Error).message },
  });
};
