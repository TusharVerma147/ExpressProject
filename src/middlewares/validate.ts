import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body against a DTO schema and replaces it with the parsed value.
 * A ZodError is thrown → central error handler → 400.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

/** Validates and replaces req.params with the parsed value. */
export const validateParams =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };

/**
 * Validates req.query. In Express 5, req.query is read-only, so the
 * parsed value is stored on res.locals.query for the controller to use.
 */
export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.query = schema.parse(req.query);
    next();
  };
