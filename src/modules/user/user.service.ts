import type { QueryResultRow } from 'pg';
import { pool } from '../../config/db';
import { conflict, notFound } from '../../errors/APIError';
import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto';
import type { User } from './user.interface';

interface UserRow extends QueryResultRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
});

const toResponse = (user: User): UserResponseDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';

export const findAllUsers = async (): Promise<UserResponseDto[]> => {
  const { rows } = await pool.query<UserRow>('SELECT id, name, email, created_at FROM users ORDER BY id');
  return rows.map((row) => toResponse(toUser(row)));
};

export const findUserById = async (id: number): Promise<UserResponseDto> => {
  const { rows } = await pool.query<UserRow>('SELECT id, name, email, created_at FROM users WHERE id = $1', [id]);
  const row = rows[0];
  if (!row) throw notFound(`User ${id} not found`);
  return toResponse(toUser(row));
};

export const createUser = async (dto: CreateUserDto): Promise<UserResponseDto> => {
  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email, created_at`,
      [dto.name, dto.email],
    );
    return toResponse(toUser(rows[0]!));
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserResponseDto> => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (dto.name !== undefined) {
    values.push(dto.name);
    fields.push(`name = $${values.length}`);
  }
  if (dto.email !== undefined) {
    values.push(dto.email);
    fields.push(`email = $${values.length}`);
  }

  values.push(id);

  try {
    const { rows } = await pool.query<UserRow>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, email, created_at`,
      values,
    );
    const row = rows[0];
    if (!row) throw notFound(`User ${id} not found`);
    return toResponse(toUser(row));
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  if (!rowCount) throw notFound(`User ${id} not found`);
};
