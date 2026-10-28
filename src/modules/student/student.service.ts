import { forbidden, notFound } from '../../errors/APIError';
import type { AuthUser } from '../../types/express';
import { canAccessStudent, filterStudentsByAccess } from '../access/canAccessStudent';
import type {
  CreateStudentDto,
  ListStudentsQueryDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './student.dto';
import type { Student } from './student.interface';
import * as studentRepository from './student.repository';

const formatDateOnly = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toResponseDto = (student: Student): StudentResponseDto => ({
  id: student.id,
  rollNo: student.rollNo,
  firstName: student.firstName,
  lastName: student.lastName,
  dateOfBirth: formatDateOnly(student.dateOfBirth),
  className: student.className,
  section: student.section,
  guardian: { ...student.guardian },
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

export const listStudents = async (
  actor: AuthUser,
  query: ListStudentsQueryDto,
): Promise<StudentResponseDto[]> => {
  const students = await studentRepository.findMany({
    className: query.className,
    section: query.section,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  });
  const visible = await filterStudentsByAccess(actor, students, 'students');
  return visible.map(toResponseDto);
};

export const getStudent = async (actor: AuthUser, id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);

  if (!(await canAccessStudent(actor, student, 'read', 'students'))) {
    throw forbidden('You do not have access to this student');
  }

  return toResponseDto(student);
};

export const createStudent = async (
  actor: AuthUser,
  dto: CreateStudentDto,
): Promise<StudentResponseDto> => {
  // No existing row yet — :any write is the only path that returns true here.
  const allowed = await canAccessStudent(
    actor,
    { id: -1, className: dto.className, section: dto.section },
    'write',
    'students',
  );
  if (!allowed) throw forbidden('You do not have permission to create students');

  const student = await studentRepository.insert(dto);
  return toResponseDto(student);
};

export const updateStudent = async (
  actor: AuthUser,
  id: number,
  dto: UpdateStudentDto,
): Promise<StudentResponseDto> => {
  const existing = await studentRepository.findById(id);
  if (!existing) throw notFound(`Student ${id} not found`);

  if (!(await canAccessStudent(actor, existing, 'write', 'students'))) {
    throw forbidden('You do not have access to this student');
  }

  const student = await studentRepository.update(id, dto);
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const deleteStudent = async (actor: AuthUser, id: number): Promise<void> => {
  const existing = await studentRepository.findById(id);
  if (!existing) throw notFound(`Student ${id} not found`);

  if (!(await canAccessStudent(actor, existing, 'write', 'students'))) {
    throw forbidden('You do not have access to this student');
  }

  const deleted = await studentRepository.remove(id);
  if (!deleted) throw notFound(`Student ${id} not found`);
};
