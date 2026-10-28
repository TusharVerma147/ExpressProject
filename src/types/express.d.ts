import type { Role } from '../config/permissions';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  studentId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
