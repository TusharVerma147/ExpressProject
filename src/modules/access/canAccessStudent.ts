import { hasPermission, type Permission } from '../../config/permissions';
import type { AuthUser } from '../../types/express';
import * as adminRepository from '../admin/admin.repository';

export type AccessAction = 'read' | 'write';
export type AccessResource = 'students' | 'marks';

export interface StudentScope {
  id: number;
  className: string;
  section: string;
}

const permissionFor = (
  resource: AccessResource,
  action: AccessAction,
  scope: 'any' | 'class' | 'own',
): Permission | null => {
  if (resource === 'students') {
    if (action === 'write') {
      return scope === 'any' ? 'students:write:any' : null;
    }
    if (scope === 'any') return 'students:read:any';
    if (scope === 'class') return 'students:read:class';
    return 'students:read:own';
  }

  if (action === 'write') {
    if (scope === 'any') return 'marks:write:any';
    if (scope === 'class') return 'marks:write:class';
    return null;
  }
  if (scope === 'any') return 'marks:read:any';
  if (scope === 'class') return 'marks:read:class';
  return 'marks:read:own';
};

/**
 * Single ownership / scope helper for student & marks services.
 * Loads teacher classes and student links through repositories (no SQL here).
 *
 * Decision (B3): out-of-scope single records → 403 everywhere (not 404),
 * so clients get a consistent “authenticated but not allowed” signal.
 */
export const canAccessStudent = async (
  actor: AuthUser,
  student: StudentScope,
  action: AccessAction,
  resource: AccessResource = 'students',
): Promise<boolean> => {
  const anyPerm = permissionFor(resource, action, 'any');
  if (anyPerm && hasPermission(actor.role, anyPerm)) {
    return true;
  }

  const classPerm = permissionFor(resource, action, 'class');
  if (classPerm && hasPermission(actor.role, classPerm)) {
    return adminRepository.teacherTeaches(actor.id, student.className, student.section);
  }

  const ownPerm = permissionFor(resource, action, 'own');
  if (ownPerm && hasPermission(actor.role, ownPerm)) {
    return actor.studentId !== null && actor.studentId === student.id;
  }

  return false;
};

/** Whether the actor may see averages for a class (and optional section). */
export const canAccessClassAverages = async (
  actor: AuthUser,
  className: string,
  section?: string,
): Promise<boolean> => {
  if (hasPermission(actor.role, 'marks:averages:any')) return true;
  if (!hasPermission(actor.role, 'marks:averages:class')) return false;

  const classes = await adminRepository.findTeacherClasses(actor.id);
  if (section) {
    return classes.some((c) => c.className === className && c.section === section);
  }
  return classes.some((c) => c.className === className);
};

/**
 * LIST endpoints FILTER rather than 403: callers only learn about rows in
 * scope, without leaking that other classes/students exist via a blanket deny.
 */
export const filterStudentsByAccess = async <T extends StudentScope>(
  actor: AuthUser,
  students: T[],
  resource: AccessResource = 'students',
): Promise<T[]> => {
  if (hasPermission(actor.role, permissionFor(resource, 'read', 'any')!)) {
    return students;
  }

  if (hasPermission(actor.role, permissionFor(resource, 'read', 'class')!)) {
    const classes = (await adminRepository.findTeacherClasses(actor.id)) ?? [];
    const allowed = new Set(classes.map((c) => `${c.className}:${c.section}`));
    return students.filter((s) => allowed.has(`${s.className}:${s.section}`));
  }

  if (hasPermission(actor.role, permissionFor(resource, 'read', 'own')!)) {
    if (actor.studentId === null) return [];
    return students.filter((s) => s.id === actor.studentId);
  }

  return [];
};
