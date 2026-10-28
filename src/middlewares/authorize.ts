import type { Request, RequestHandler } from 'express';
import { hasPermission, type Permission } from '../config/permissions';
import { forbidden, unauthorized } from '../errors/APIError';

const ensureUser = (req: Request): void => {
  if (!req.user) throw unauthorized('Authentication required');
};

/** Require every listed permission (AND). */
export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    try {
      ensureUser(req);
      const allowed = permissions.every((p) => hasPermission(req.user!.role, p));
      if (!allowed) {
        next(forbidden('You do not have permission to perform this action'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };

/** Require at least one listed permission (OR) — used when roles share an endpoint. */
export const requireAnyPermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    try {
      ensureUser(req);
      const allowed = permissions.some((p) => hasPermission(req.user!.role, p));
      if (!allowed) {
        next(forbidden('You do not have permission to perform this action'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
