import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import type { Role } from '../../src/config/permissions';
import type { AuthUser } from '../../src/types/express';

/** Issue an access token the same way production does (role reloaded from DB in authenticate). */
export const as = (id: number, _role?: Role): string =>
  jwt.sign({ sub: id, typ: 'access' }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const actor = (
  id: number,
  role: Role,
  studentId: number | null = null,
): AuthUser => ({
  id,
  email: `user${id}@school.test`,
  name: `User ${id}`,
  role,
  studentId,
});
