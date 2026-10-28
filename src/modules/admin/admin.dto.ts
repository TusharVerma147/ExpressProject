import { z } from 'zod';
import { idParam } from '../../utils/validators';
import { classNameSchema, sectionSchema } from '../student/student.dto';

export const teacherClassDto = z.strictObject({
  teacherUserId: idParam,
  className: classNameSchema,
  section: sectionSchema,
});
export type TeacherClassDto = z.infer<typeof teacherClassDto>;

export const studentLinkDto = z.strictObject({
  userId: idParam,
  studentId: idParam,
});
export type StudentLinkDto = z.infer<typeof studentLinkDto>;
