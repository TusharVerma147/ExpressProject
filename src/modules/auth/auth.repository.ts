import type { QueryResultRow } from 'pg';
import { pool } from '../../config/db';
import type { Role } from '../../config/permissions';
import { conflict } from '../../errors/APIError';

export interface AuthUserRow extends QueryResultRow {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  role: string;
  student_id: number | null;
  created_at: Date;
}

export interface AuthUserRecord {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  studentId: number | null;
  createdAt: Date;
}

const toRecord = (row: AuthUserRow): AuthUserRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role as Role,
  studentId: row.student_id,
  createdAt: row.created_at,
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';

const SELECT = `id, name, email, password_hash, role, student_id, created_at`;

export const findAuthUserById = async (id: number): Promise<AuthUserRecord | null> => {
  const { rows } = await pool.query<AuthUserRow>(`SELECT ${SELECT} FROM users WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? toRecord(row) : null;
};

export const findAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  const { rows } = await pool.query<AuthUserRow>(`SELECT ${SELECT} FROM users WHERE email = $1`, [
    email,
  ]);
  const row = rows[0];
  return row ? toRecord(row) : null;
};

export const insertAuthUser = async (input: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}): Promise<AuthUserRecord> => {
  try {
    const { rows } = await pool.query<AuthUserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT}`,
      [input.name, input.email, input.passwordHash, input.role ?? 'user'],
    );
    return toRecord(rows[0]!);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const updateUserRole = async (id: number, role: Role): Promise<AuthUserRecord | null> => {
  const { rows } = await pool.query<AuthUserRow>(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING ${SELECT}`,
    [id, role],
  );
  const row = rows[0];
  return row ? toRecord(row) : null;
};

export const linkStudent = async (userId: number, studentId: number): Promise<AuthUserRecord | null> => {
  const { rows } = await pool.query<AuthUserRow>(
    `UPDATE users SET student_id = $2 WHERE id = $1 RETURNING ${SELECT}`,
    [userId, studentId],
  );
  const row = rows[0];
  return row ? toRecord(row) : null;
};

export const findUserIdByStudentId = async (studentId: number): Promise<number | null> => {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE student_id = $1 LIMIT 1`,
    [studentId],
  );
  return rows[0]?.id ?? null;
};
