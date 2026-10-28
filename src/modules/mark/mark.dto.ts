import { z } from 'zod';
import { idParam, pagination, tag } from '../../utils/validators';
import { classNameSchema, sectionSchema } from '../student/student.dto';

export const examSchema = z.enum(['unit-1', 'midterm', 'unit-2', 'final']);

const atMostTwoDecimals = (value: number): boolean =>
  Number.isFinite(value) && Math.round(value * 100) === value * 100;

const markItemSchema = z.strictObject({
  subject: tag,
  score: z
    .number({ error: 'score must be a number' })
    .min(0, { error: 'score must be >= 0' })
    .refine(atMostTwoDecimals, { error: 'score may have at most 2 decimal places' }),
  maxScore: z
    .number({ error: 'maxScore must be a number' })
    .min(1, { error: 'maxScore must be between 1 and 200' })
    .max(200, { error: 'maxScore must be between 1 and 200' })
    .refine(atMostTwoDecimals, { error: 'maxScore may have at most 2 decimal places' })
    .default(100),
});

export const createMarksBodyDto = z
  .strictObject({
    exam: examSchema,
    marks: z.array(markItemSchema).min(1).max(15),
  })
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < body.marks.length; i += 1) {
      const item = body.marks[i]!;
      if (item.score > item.maxScore) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', i, 'score'],
          message: 'score must be <= maxScore',
        });
      }
      if (seen.has(item.subject)) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks'],
          message: 'subjects must be unique within the marks array',
        });
        break;
      }
      seen.add(item.subject);
    }
  });
export type CreateMarksBodyDto = z.infer<typeof createMarksBodyDto>;

export const updateMarkDto = z
  .strictObject({
    score: z
      .number({ error: 'score must be a number' })
      .min(0, { error: 'score must be >= 0' })
      .refine(atMostTwoDecimals, { error: 'score may have at most 2 decimal places' })
      .optional(),
    maxScore: z
      .number({ error: 'maxScore must be a number' })
      .min(1, { error: 'maxScore must be between 1 and 200' })
      .max(200, { error: 'maxScore must be between 1 and 200' })
      .refine(atMostTwoDecimals, { error: 'maxScore may have at most 2 decimal places' })
      .optional(),
  })
  .refine((body) => body.score !== undefined || body.maxScore !== undefined, {
    error: 'Provide score and/or maxScore',
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

export const markIdParamDto = z.object({
  id: idParam,
});
export type MarkIdParamDto = z.infer<typeof markIdParamDto>;

export const averagesQueryDto = z
  .object({
    className: classNameSchema,
    exam: examSchema.optional(),
    section: sectionSchema.optional(),
  })
  .strip();
export type AveragesQueryDto = z.infer<typeof averagesQueryDto>;

// Re-export pagination helper usage if needed by list endpoints later
export const markListQueryDto = pagination.strip();

export interface MarkResponseDto {
  id: number;
  studentId: number;
  exam: 'unit-1' | 'midterm' | 'unit-2' | 'final';
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAverageResponseDto {
  subject: string;
  averagePercentage: number;
  students: number;
  passed: boolean;
}
