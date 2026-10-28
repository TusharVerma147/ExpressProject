import { env } from '../../config/env';
import { badRequest, notFound } from '../../errors/APIError';
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
  studentId: number,
  body: CreateMarksBodyDto,
): Promise<MarkResponseDto[]> => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw notFound(`Student ${studentId} not found`);

  const marks = await markRepository.insertMany(studentId, body.exam, body.marks);
  return marks.map(toResponseDto);
};

export const updateMark = async (id: number, dto: UpdateMarkDto): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

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

export const deleteMark = async (id: number): Promise<void> => {
  const deleted = await markRepository.remove(id);
  if (!deleted) throw notFound(`Mark ${id} not found`);
};

export const getMark = async (id: number): Promise<MarkResponseDto> => {
  const mark = await markRepository.findById(id);
  if (!mark) throw notFound(`Mark ${id} not found`);
  return toResponseDto(mark);
};

export const getSubjectAverages = async (
  query: AveragesQueryDto,
): Promise<SubjectAverageResponseDto[]> => {
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
