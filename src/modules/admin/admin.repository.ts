import type { QueryResultRow } from 'pg';
import { pool } from '../../config/db';
import { conflict } from '../../errors/APIError';

export interface TeacherClass {
  teacherUserId: number;
  className: string;
  section: string;
}

interface TeacherClassRow extends QueryResultRow {
  teacher_user_id: number;
  class_name: string;
  section: string;
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';

export const insertTeacherClass = async (input: TeacherClass): Promise<TeacherClass> => {
  try {
    const { rows } = await pool.query<TeacherClassRow>(
      `INSERT INTO teacher_classes (teacher_user_id, class_name, section)
       VALUES ($1, $2, $3)
       RETURNING teacher_user_id, class_name, section`,
      [input.teacherUserId, input.className, input.section],
    );
    const row = rows[0]!;
    return {
      teacherUserId: row.teacher_user_id,
      className: row.class_name,
      section: row.section.trim(),
    };
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('Teacher is already linked to that class/section');
    throw err;
  }
};

export const findTeacherClasses = async (teacherUserId: number): Promise<TeacherClass[]> => {
  const { rows } = await pool.query<TeacherClassRow>(
    `SELECT teacher_user_id, class_name, section
     FROM teacher_classes
     WHERE teacher_user_id = $1
     ORDER BY class_name, section`,
    [teacherUserId],
  );
  return rows.map((row) => ({
    teacherUserId: row.teacher_user_id,
    className: row.class_name,
    section: row.section.trim(),
  }));
};

export const teacherTeaches = async (
  teacherUserId: number,
  className: string,
  section: string,
): Promise<boolean> => {
  const { rows } = await pool.query(
    `SELECT 1 FROM teacher_classes
     WHERE teacher_user_id = $1 AND class_name = $2 AND section = $3
     LIMIT 1`,
    [teacherUserId, className, section],
  );
  return rows.length > 0;
};
