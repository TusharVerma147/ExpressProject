/**
 * Role → permission map. Route guards and services must check PERMISSIONS
 * (via hasPermission / can / requirePermission), never raw role names.
 */

export const ROLES = ['admin', 'user', 'moderator', 'teacher', 'student'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'admin:manage',
  'students:read:own',
  'students:read:class',
  'students:read:any',
  'students:write:any',
  'marks:read:own',
  'marks:read:class',
  'marks:read:any',
  'marks:write:class',
  'marks:write:any',
  'marks:averages:class',
  'marks:averages:any',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL_STUDENT_MARK_PERMS: Permission[] = [
  'students:read:own',
  'students:read:class',
  'students:read:any',
  'students:write:any',
  'marks:read:own',
  'marks:read:class',
  'marks:read:any',
  'marks:write:class',
  'marks:write:any',
  'marks:averages:class',
  'marks:averages:any',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['admin:manage', ...ALL_STUDENT_MARK_PERMS],
  teacher: [
    'students:read:class',
    'marks:read:class',
    'marks:write:class',
    'marks:averages:class',
  ],
  student: ['students:read:own', 'marks:read:own'],
  // Kept for existing / starter tests — no students/marks access.
  user: [],
  moderator: [],
};

export const hasPermission = (role: Role, permission: Permission): boolean =>
  (ROLE_PERMISSIONS[role] ?? []).includes(permission);

/** True if the role has every listed permission. */
export const can = (role: Role, ...permissions: Permission[]): boolean =>
  permissions.every((p) => hasPermission(role, p));

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);
