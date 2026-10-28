import { env } from '../../config/env';
import { badRequest, forbidden, notFound } from '../../errors/APIError';
import type { AuthUser } from '../../types/express';
import { canAccessClassAverages, canAccessStudent } from '../access/canAccessStudent';
import * as studentRepository from '../student/student.repository';
import type {
  AveragesQueryDto,
  CreateMarksBodyDto,
  MarkResponseDto,
  SubjectAverageResponseDto,
  UpdateMarkDto,
} from './mark.dto';
import type { Mark } from './mark.interface';
import * as markRepository from './mark.repository';

export const toResponseDto = (mark: Mark): MarkResponseDto => ({
  id: mark.id,
  studentId: mark.studentId,
  exam: mark.exam,
  subject: mark.subject,
  score: mark.score,
  maxScore: mark.maxScore,
  createdAt: mark.createdAt.toISOString(),
  updatedAt: mark.updatedAt.toISOString(),
});

export const createMarksForStudent = async (
  actor: AuthUser,
  studentId: number,
  body: CreateMarksBodyDto,
): Promise<MarkResponseDto[]> => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw notFound(`Student ${studentId} not found`);

  if (!(await canAccessStudent(actor, student, 'write', 'marks'))) {
    throw forbidden('You do not have access to enter marks for this student');
  }

  const marks = await markRepository.insertMany(studentId, body.exam, body.marks);
  return marks.map(toResponseDto);
};

export const updateMark = async (
  actor: AuthUser,
  id: number,
  dto: UpdateMarkDto,
): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

  const student = await studentRepository.findById(existing.studentId);
  if (!student) throw notFound(`Student ${existing.studentId} not found`);

  if (!(await canAccessStudent(actor, student, 'write', 'marks'))) {
    throw forbidden('You do not have access to update this mark');
  }

  const nextScore = dto.score ?? existing.score;
  const nextMaxScore = dto.maxScore ?? existing.maxScore;
  if (nextScore > nextMaxScore) {
    throw badRequest('score must be <= maxScore after update', [
      { path: 'score', message: 'score must be <= maxScore' },
    ]);
  }

  const updated = await markRepository.update(id, {
    score: dto.score,
    maxScore: dto.maxScore,
  });
  if (!updated) throw notFound(`Mark ${id} not found`);
  return toResponseDto(updated);
};

export const deleteMark = async (actor: AuthUser, id: number): Promise<void> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

  const student = await studentRepository.findById(existing.studentId);
  if (!student) throw notFound(`Student ${existing.studentId} not found`);

  if (!(await canAccessStudent(actor, student, 'write', 'marks'))) {
    throw forbidden('You do not have access to delete this mark');
  }

  const deleted = await markRepository.remove(id);
  if (!deleted) throw notFound(`Mark ${id} not found`);
};

export const getMark = async (actor: AuthUser, id: number): Promise<MarkResponseDto> => {
  const mark = await markRepository.findById(id);
  if (!mark) throw notFound(`Mark ${id} not found`);

  const student = await studentRepository.findById(mark.studentId);
  if (!student) throw notFound(`Student ${mark.studentId} not found`);

  if (!(await canAccessStudent(actor, student, 'read', 'marks'))) {
    throw forbidden('You do not have access to this mark');
  }

  return toResponseDto(mark);
};

export const getSubjectAverages = async (
  actor: AuthUser,
  query: AveragesQueryDto,
): Promise<SubjectAverageResponseDto[]> => {
  if (!(await canAccessClassAverages(actor, query.className, query.section))) {
    throw forbidden('You do not have access to averages for this class');
  }

  const averages = await markRepository.subjectAverages({
    className: query.className,
    exam: query.exam,
    section: query.section,
  });

  return averages.map((row) => {
    const averagePercentage = Math.round(row.averagePercentage * 100) / 100;
    return {
      subject: row.subject,
      averagePercentage,
      students: row.students,
      passed: averagePercentage >= env.PASS_PERCENTAGE,
    };
  });
};
