import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { isRole } from '../config/permissions';
import { unauthorized } from '../errors/APIError';
import type { AuthUser } from '../types/express';
import * as authRepository from '../modules/auth/auth.repository';

interface AccessTokenPayload {
  sub: number;
  typ: 'access';
}

const isAccessPayload = (value: unknown): value is AccessTokenPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.sub === 'number' && obj.typ === 'access';
};

/**
 * Verifies the Bearer access token, then reloads the user (including role)
 * from the database so role changes take effect before the JWT expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('Missing or invalid Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw unauthorized('Missing or invalid Authorization header');

    let decoded: unknown;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw unauthorized('Invalid or expired access token');
    }

    if (!isAccessPayload(decoded)) {
      throw unauthorized('Invalid access token');
    }

    const user = await authRepository.findAuthUserById(decoded.sub);
    if (!user || !isRole(user.role)) {
      throw unauthorized('User no longer exists');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
    };
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
};

/** Sign a short-lived access token (role is NOT trusted from the token alone). */
export const signAccessToken = (userId: number): string =>
  jwt.sign({ sub: userId, typ: 'access' } satisfies AccessTokenPayload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
