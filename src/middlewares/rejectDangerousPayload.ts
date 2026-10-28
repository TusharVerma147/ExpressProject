import type { RequestHandler } from 'express';
import { badRequest, createError } from '../errors/APIError';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_BODY_BYTES = 100_000;

const hasDangerousKey = (value: unknown, depth = 0): boolean => {
  if (value === null || typeof value !== 'object' || depth > 20) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasDangerousKey(item, depth + 1));
  }

  for (const key of Object.getOwnPropertyNames(value)) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (hasDangerousKey((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
};

const approximateSize = (value: unknown): number => {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

/**
 * Rejects prototype-pollution keys and oversized bodies BEFORE Zod validation.
 * Must be registered after express.json().
 */
export const rejectDangerousPayload: RequestHandler = (req, _res, next) => {
  if (req.body === undefined || req.body === null) {
    next();
    return;
  }

  if (typeof req.body === 'object' && approximateSize(req.body) > MAX_BODY_BYTES) {
    next(createError(413, 'Payload too large'));
    return;
  }

  if (hasDangerousKey(req.body)) {
    next(badRequest('Dangerous payload rejected', [{ path: '', message: 'Prototype pollution keys are not allowed' }]));
    return;
  }

  next();
};
