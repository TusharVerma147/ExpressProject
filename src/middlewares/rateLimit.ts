import type { Request, RequestHandler, Response } from 'express';
import { tooManyRequests } from '../errors/APIError';

export interface RateLimiterOptions {
  /** Sliding / fixed window length in ms. */
  windowMs: number;
  /** Max requests per key per window. */
  max: number;
  /** Stable key for the client (e.g. user id). */
  keyFn: (req: Request) => string;
  message?: string;
}

interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory fixed-window rate limiter.
 * Tests can call createRateLimiter with a low `max` for speed.
 */
export const createRateLimiter = (options: RateLimiterOptions): RequestHandler => {
  const buckets = new Map<string, WindowState>();
  const message = options.message ?? 'Too many requests';

  return (req: Request, _res: Response, next) => {
    const key = options.keyFn(req);
    const now = Date.now();
    let state = buckets.get(key);

    if (!state || now >= state.resetAt) {
      state = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, state);
    }

    state.count += 1;
    if (state.count > options.max) {
      next(tooManyRequests(message));
      return;
    }

    next();
  };
};
