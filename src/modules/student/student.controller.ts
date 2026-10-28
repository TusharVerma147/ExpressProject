import { Router, type Request, type Response } from 'express';
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

router.get(
  '/',
  validateQuery(listStudentsQueryDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.listStudents(res.locals.query));
  }),
);

router.post(
  '/',
  validateBody(createStudentDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await studentService.createStudent(req.body), 201);
  }),
);

router.post(
  '/:id/marks',
  validateParams(studentIdParamDto),
  validateBody(createMarksBodyDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.createMarksForStudent(id, req.body), 201);
  }),
);

router.get(
  '/:id',
  validateParams(studentIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await studentService.getStudent(id));
  }),
);

router.patch(
  '/:id',
  validateParams(studentIdParamDto),
  validateBody(updateStudentDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await studentService.updateStudent(id, req.body));
  }),
);

router.delete(
  '/:id',
  validateParams(studentIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    await studentService.deleteStudent(id);
    sendSuccess(res, null, 204);
  }),
);

export default router;
