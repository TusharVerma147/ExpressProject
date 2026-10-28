export type ExamType = 'unit-1' | 'midterm' | 'unit-2' | 'final';

export interface Mark {
  id: number;
  studentId: number;
  exam: ExamType;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Flat DB row — never leaves the repository. NUMERIC columns arrive as strings. */
export interface MarkRow {
  id: number;
  student_id: number;
  exam: string;
  subject: string;
  score: string | number;
  max_score: string | number;
  created_at: Date;
  updated_at: Date;
}

export type MarkChanges = Partial<{
  score: number;
  maxScore: number;
}>;

export type MarkWritableColumns = Partial<{
  student_id: number;
  exam: string;
  subject: string;
  score: number;
  max_score: number;
}>;

export interface MarkInput {
  subject: string;
  score: number;
  maxScore: number;
}

export interface SubjectAverage {
  subject: string;
  averagePercentage: number;
  students: number;
}

export interface SubjectAverageFilter {
  className: string;
  exam?: ExamType;
  section?: string;
}
