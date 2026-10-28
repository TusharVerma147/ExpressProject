import type { QueryResultRow } from 'pg';
import { pool } from '../../config/db';
import { conflict, notFound } from '../../errors/APIError';
import type {
  ExamType,
  Mark,
  MarkChanges,
  MarkInput,
  MarkRow,
  MarkWritableColumns,
  SubjectAverage,
  SubjectAverageFilter,
} from './mark.interface';

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';

const isForeignKeyViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503';

const toNumber = (value: string | number, field: string): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid NUMERIC value for ${field}: ${String(value)}`);
  }
  return n;
};

export const toDomain = (row: MarkRow): Mark => ({
  id: row.id,
  studentId: row.student_id,
  exam: row.exam as ExamType,
  subject: row.subject,
  score: toNumber(row.score, 'score'),
  maxScore: toNumber(row.max_score, 'max_score'),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toPersistence = (
  mark: Partial<{ studentId: number; exam: ExamType; subject: string; score: number; maxScore: number }>,
): MarkWritableColumns => {
  const columns: MarkWritableColumns = {};
  if (mark.studentId !== undefined) columns.student_id = mark.studentId;
  if (mark.exam !== undefined) columns.exam = mark.exam;
  if (mark.subject !== undefined) columns.subject = mark.subject;
  if (mark.score !== undefined) columns.score = mark.score;
  if (mark.maxScore !== undefined) columns.max_score = mark.maxScore;
  return columns;
};

type MarkDbRow = MarkRow & QueryResultRow;

const SELECT_COLUMNS = `
  id, student_id, exam, subject, score, max_score, created_at, updated_at
`;

export const findById = async (id: number): Promise<Mark | null> => {
  const { rows } = await pool.query<MarkDbRow>(
    `SELECT ${SELECT_COLUMNS} FROM marks WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? toDomain(row) : null;
};

export const insertMany = async (
  studentId: number,
  exam: ExamType,
  marks: MarkInput[],
): Promise<Mark[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted: Mark[] = [];

    for (const item of marks) {
      const { rows } = await client.query<MarkDbRow>(
        `INSERT INTO marks (student_id, exam, subject, score, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${SELECT_COLUMNS}`,
        [studentId, exam, item.subject, item.score, item.maxScore],
      );
      inserted.push(toDomain(rows[0]!));
    }

    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    if (isForeignKeyViolation(err)) throw notFound(`Student ${studentId} not found`);
    if (isUniqueViolation(err)) {
      throw conflict(`Marks for student ${studentId} in exam "${exam}" already exist for a subject`);
    }
    throw err;
  } finally {
    client.release();
  }
};

export const update = async (id: number, changes: MarkChanges): Promise<Mark | null> => {
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
    const { rows } = await pool.query<MarkDbRow>(
      `UPDATE marks
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    );
    const row = rows[0];
    return row ? toDomain(row) : null;
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('Mark conflict');
    throw err;
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const { rowCount } = await pool.query('DELETE FROM marks WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
};

interface AverageRow extends QueryResultRow {
  subject: string;
  average_percentage: string;
  students: string;
}

export const subjectAverages = async (filter: SubjectAverageFilter): Promise<SubjectAverage[]> => {
  const conditions: string[] = ['s.class_name = $1'];
  const values: unknown[] = [filter.className];

  if (filter.exam !== undefined) {
    values.push(filter.exam);
    conditions.push(`m.exam = $${values.length}`);
  }
  if (filter.section !== undefined) {
    values.push(filter.section);
    conditions.push(`s.section = $${values.length}`);
  }

  const { rows } = await pool.query<AverageRow>(
    `SELECT
       m.subject,
       ROUND(AVG(m.score / NULLIF(m.max_score, 0) * 100)::numeric, 2) AS average_percentage,
       COUNT(DISTINCT m.student_id)::text AS students
     FROM marks m
     INNER JOIN students s ON s.id = m.student_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY m.subject
     ORDER BY m.subject`,
    values,
  );

  return rows.map((row) => ({
    subject: row.subject,
    averagePercentage: toNumber(row.average_percentage, 'average_percentage'),
    students: Number(row.students),
  }));
};
