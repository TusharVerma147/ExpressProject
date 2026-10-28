import type { RequestHandler } from 'express';

/** Prevent caching of personal / auth responses. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
