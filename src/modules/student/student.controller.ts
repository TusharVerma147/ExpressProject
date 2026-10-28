import { Router, type Request, type Response } from 'express';
import { env } from '../../config/env';
import { unauthorized } from '../../errors/APIError';
import { authenticate } from '../../middlewares/authenticate';
import { requireAnyPermission, requirePermission } from '../../middlewares/authorize';
import { createRateLimiter } from '../../middlewares/rateLimit';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { curlResponse, sendSuccess } from '../../utils/http';
import { createMarksBodyDto } from '../mark/mark.dto';
import * as markService from '../mark/mark.service';
import {
  createStudentDto,
  listStudentsQueryDto,
  studentIdParamDto,
  updateStudentDto,
} from './student.dto';
import * as studentService from './student.service';

const router = Router();

/** Exported so tests can mount a low-max limiter while keeping production defaults. */
export const createMarksWriteLimiter = (max = env.MARKS_RATE_LIMIT_MAX) =>
  createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max,
    keyFn: (req) => {
      if (!req.user) throw unauthorized('Authentication required');
      return `marks-write:${req.user.id}`;
    },
    message: 'Mark entry rate limit exceeded; try again later',
  });

const marksWriteLimiter = createMarksWriteLimiter();

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission('students:read:own', 'students:read:class', 'students:read:any'),
  validateQuery(listStudentsQueryDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.listStudents(req.user!, res.locals.query));
  }),
);

router.post(
  '/',
  requirePermission('students:write:any'),
  validateBody(createStudentDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.createStudent(req.user!, req.body), 201);
  }),
);

router.post(
  '/:id/marks',
  requireAnyPermission('marks:write:class', 'marks:write:any'),
  marksWriteLimiter,
  validateParams(studentIdParamDto),
  validateBody(createMarksBodyDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.createMarksForStudent(req.user!, id, req.body), 201);
  }),
);

router.get(
  '/:id',
  requireAnyPermission('students:read:own', 'students:read:class', 'students:read:any'),
  validateParams(studentIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await studentService.getStudent(req.user!, id));
  }),
);

router.patch(
  '/:id',
  requirePermission('students:write:any'),
  validateParams(studentIdParamDto),
  validateBody(updateStudentDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await studentService.updateStudent(req.user!, id, req.body));
  }),
);

router.delete(
  '/:id',
  requirePermission('students:write:any'),
  validateParams(studentIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    await studentService.deleteStudent(req.user!, id);
    sendSuccess(res, null, 204);
  }),
);

export default router;
