import { badRequest, conflict, notFound } from '../../errors/APIError';
import { hasPermission } from '../../config/permissions';
import * as authRepository from '../auth/auth.repository';
import * as studentRepository from '../student/student.repository';
import type { StudentLinkDto, TeacherClassDto } from './admin.dto';
import * as adminRepository from './admin.repository';

/** Student accounts have :own but neither :class nor :any. */
const isStudentAccountRole = (role: Parameters<typeof hasPermission>[0]): boolean =>
  hasPermission(role, 'students:read:own') &&
  !hasPermission(role, 'students:read:class') &&
  !hasPermission(role, 'students:read:any');

export const assignTeacherClass = async (dto: TeacherClassDto) => {
  const user = await authRepository.findAuthUserById(dto.teacherUserId);
  if (!user) throw notFound(`User ${dto.teacherUserId} not found`);

  // Identified via permission map, not `role === 'teacher'`.
  if (!hasPermission(user.role, 'students:read:class')) {
    throw badRequest('Target account must be a teacher');
  }

  return adminRepository.insertTeacherClass({
    teacherUserId: dto.teacherUserId,
    className: dto.className,
    section: dto.section,
  });
};

export const linkStudentAccount = async (dto: StudentLinkDto) => {
  const user = await authRepository.findAuthUserById(dto.userId);
  if (!user) throw notFound(`User ${dto.userId} not found`);

  if (!isStudentAccountRole(user.role)) {
    throw badRequest('Target account must be a student');
  }

  const student = await studentRepository.findById(dto.studentId);
  if (!student) throw notFound(`Student ${dto.studentId} not found`);

  if (user.studentId !== null) {
    throw conflict('User is already linked to a student record');
  }

  const existingLink = await authRepository.findUserIdByStudentId(dto.studentId);
  if (existingLink !== null) {
    throw conflict('Student is already linked to a user account');
  }

  const updated = await authRepository.linkStudent(dto.userId, dto.studentId);
  if (!updated) throw notFound(`User ${dto.userId} not found`);

  return {
    userId: updated.id,
    studentId: updated.studentId,
    role: updated.role,
  };
};
