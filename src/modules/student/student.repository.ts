import type { QueryResultRow } from 'pg';
import { pool } from '../../config/db';
import { conflict } from '../../errors/APIError';
import { escapeLike } from '../../utils/validators';
import type { CreateStudentDto } from './student.dto';
import type {
  GuardianRelation,
  Student,
  StudentChanges,
  StudentFilter,
  StudentRow,
  StudentWritableColumns,
} from './student.interface';

const GUARDIAN_RELATIONS = new Set<GuardianRelation>(['father', 'mother', 'guardian']);

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';

const toDate = (value: Date | string): Date => {
  // pg returns DATE as a JS Date at local midnight — rebuild as UTC date-only
  // so timezones (e.g. IST) don't shift the calendar day.
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  return new Date(value);
};

const formatDateOnly = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toDomain = (row: StudentRow): Student => {
  const relation = row.guardian_relation as GuardianRelation;
  if (!GUARDIAN_RELATIONS.has(relation)) {
    throw new Error(`Unknown guardian_relation: ${row.guardian_relation}`);
  }

  return {
    id: row.id,
    rollNo: row.roll_no,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: toDate(row.date_of_birth),
    className: row.class_name,
    section: row.section.trim(),
    guardian: {
      name: row.guardian_name,
      phone: row.guardian_phone,
      relation,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toPersistence = (changes: StudentChanges): StudentWritableColumns => {
  const columns: StudentWritableColumns = {};

  if (changes.rollNo !== undefined) columns.roll_no = changes.rollNo;
  if (changes.firstName !== undefined) columns.first_name = changes.firstName;
  if (changes.lastName !== undefined) columns.last_name = changes.lastName;
  if (changes.dateOfBirth !== undefined) columns.date_of_birth = formatDateOnly(changes.dateOfBirth);
  if (changes.className !== undefined) columns.class_name = changes.className;
  if (changes.section !== undefined) columns.section = changes.section;
  if (changes.guardian !== undefined) {
    columns.guardian_name = changes.guardian.name;
    columns.guardian_phone = changes.guardian.phone;
    columns.guardian_relation = changes.guardian.relation;
  }

  return columns;
};

type StudentDbRow = StudentRow & QueryResultRow;

const SELECT_COLUMNS = `
  id, roll_no, first_name, last_name, date_of_birth, class_name, section,
  guardian_name, guardian_phone, guardian_relation, created_at, updated_at
`;

export const findMany = async (filter: StudentFilter): Promise<Student[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.className !== undefined) {
    values.push(filter.className);
    conditions.push(`class_name = $${values.length}`);
  }
  if (filter.section !== undefined) {
    values.push(filter.section);
    conditions.push(`section = $${values.length}`);
  }
  if (filter.search !== undefined) {
    const pattern = `%${escapeLike(filter.search)}%`;
    values.push(pattern);
    const idx = values.length;
    conditions.push(
      `(roll_no ILIKE $${idx} ESCAPE '\\' OR first_name ILIKE $${idx} ESCAPE '\\' OR last_name ILIKE $${idx} ESCAPE '\\')`,
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(filter.limit);
  const limitIdx = values.length;
  values.push(filter.offset);
  const offsetIdx = values.length;

  const { rows } = await pool.query<StudentDbRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM students
     ${where}
     ORDER BY id
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values,
  );
  return rows.map(toDomain);
};

export const findById = async (id: number): Promise<Student | null> => {
  const { rows } = await pool.query<StudentDbRow>(
    `SELECT ${SELECT_COLUMNS} FROM students WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? toDomain(row) : null;
};

export const insert = async (dto: CreateStudentDto): Promise<Student> => {
  const columns = toPersistence({
    rollNo: dto.rollNo,
    firstName: dto.firstName,
    lastName: dto.lastName,
    dateOfBirth: dto.dateOfBirth,
    className: dto.className,
    section: dto.section,
    guardian: dto.guardian,
  });

  try {
    const { rows } = await pool.query<StudentDbRow>(
      `INSERT INTO students (
         roll_no, first_name, last_name, date_of_birth, class_name, section,
         guardian_name, guardian_phone, guardian_relation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${SELECT_COLUMNS}`,
      [
        columns.roll_no,
        columns.first_name,
        columns.last_name,
        columns.date_of_birth,
        columns.class_name,
        columns.section,
        columns.guardian_name,
        columns.guardian_phone,
        columns.guardian_relation,
      ],
    );
    return toDomain(rows[0]!);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A student with that roll number already exists');
    throw err;
  }
};

export const update = async (id: number, changes: StudentChanges): Promise<Student | null> => {
  const columns = toPersistence(changes);
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(columns)) {
    if (value === undefined) continue;
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  try {
    const { rows } = await pool.query<StudentDbRow>(
      `UPDATE students
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toDomain(row) : null;
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A student with that roll number already exists');
    throw err;
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const { rowCount } = await pool.query('DELETE FROM students WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
};
