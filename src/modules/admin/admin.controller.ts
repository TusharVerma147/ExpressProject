import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/authorize';
import { validateBody } from '../../middlewares/validate';
import { curlResponse, sendSuccess } from '../../utils/http';
import { studentLinkDto, teacherClassDto } from './admin.dto';
import * as adminService from './admin.service';

const router = Router();

router.use(authenticate);

router.post(
  '/teacher-classes',
  requirePermission('admin:manage'),
  validateBody(teacherClassDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await adminService.assignTeacherClass(req.body), 201);
  }),
);

router.post(
  '/student-links',
  requirePermission('admin:manage'),
  validateBody(studentLinkDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await adminService.linkStudentAccount(req.body), 201);
  }),
);

export default router;
