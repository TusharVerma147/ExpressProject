import { z } from 'zod';
import { idParam, pagination, personName, safeText } from '../../utils/validators';

const ROLL_NO_PATTERN = /^\d{4}-\d{1,2}[A-F]-\d{3}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const CLASS_NAMES = new Set(Array.from({ length: 12 }, (_, i) => String(i + 1)));
const GUARDIAN_RELATIONS = ['father', 'mother', 'guardian'] as const;

const ageInYears = (dob: Date, today: Date): number => {
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

const parseRealDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

export const rollNoSchema = safeText('rollNo')
  .transform((value) => value.toUpperCase())
  .refine((value) => ROLL_NO_PATTERN.test(value), {
    error: 'rollNo must match YYYY-C[A-F]-NNN (e.g. 2026-10A-017)',
  });

export const classNameSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => CLASS_NAMES.has(value), {
    error: 'className must be a string "1" through "12"',
  });

export const sectionSchema = safeText('section')
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-F]$/.test(value), {
    error: 'section must be a single letter A-F',
  });

export const dateOfBirthSchema = z
  .string({ error: 'dateOfBirth must be a YYYY-MM-DD string' })
  .refine((value) => parseRealDate(value) !== null, {
    error: 'dateOfBirth must be a real calendar date (YYYY-MM-DD)',
  })
  .transform((value) => parseRealDate(value)!)
  .refine(
    (date) => {
      const age = ageInYears(date, new Date());
      return age >= 3 && age <= 25;
    },
    { error: 'student age must be between 3 and 25 years' },
  );

export const guardianSchema = z.strictObject({
  name: personName('guardian.name'),
  phone: z
    .string({ error: 'guardian.phone must be a string' })
    .transform((value) => value.trim().replace(/[\s-]/g, ''))
    .refine((value) => E164_PATTERN.test(value), {
      error: 'guardian.phone must be E.164 (e.g. +919876543210)',
    }),
  relation: z
    .string({ error: 'guardian.relation must be a string' })
    .transform((value) => value.trim().toLowerCase())
    .refine(
      (value): value is (typeof GUARDIAN_RELATIONS)[number] =>
        (GUARDIAN_RELATIONS as readonly string[]).includes(value),
      { error: 'guardian.relation must be father, mother, or guardian' },
    ),
});

export const createStudentDto = z.strictObject({
  rollNo: rollNoSchema,
  firstName: personName('firstName'),
  lastName: personName('lastName'),
  dateOfBirth: dateOfBirthSchema,
  className: classNameSchema,
  section: sectionSchema,
  guardian: guardianSchema,
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

export const updateStudentDto = z
  .strictObject({
    rollNo: rollNoSchema.optional(),
    firstName: personName('firstName').optional(),
    lastName: personName('lastName').optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    className: classNameSchema.optional(),
    section: sectionSchema.optional(),
    guardian: guardianSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    error: 'Provide at least one field to update',
  });
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

export const studentIdParamDto = z.object({
  id: idParam,
});
export type StudentIdParamDto = z.infer<typeof studentIdParamDto>;

export const listStudentsQueryDto = pagination
  .extend({
    className: classNameSchema.optional(),
    section: sectionSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strip();
export type ListStudentsQueryDto = z.infer<typeof listStudentsQueryDto>;

export interface StudentResponseDto {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  section: string;
  guardian: {
    name: string;
    phone: string;
    relation: 'father' | 'mother' | 'guardian';
  };
  createdAt: string;
  updatedAt: string;
}
