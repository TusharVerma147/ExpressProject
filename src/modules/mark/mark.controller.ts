import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireAnyPermission, requirePermission } from '../../middlewares/authorize';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { curlResponse, sendSuccess } from '../../utils/http';
import { averagesQueryDto, markIdParamDto, updateMarkDto } from './mark.dto';
import * as markService from './mark.service';

const router = Router();

router.use(authenticate);

/** Registered before /:id so "averages" is not parsed as an id. */
router.get(
  '/averages',
  requireAnyPermission('marks:averages:class', 'marks:averages:any'),
  validateQuery(averagesQueryDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await markService.getSubjectAverages(req.user!, res.locals.query));
  }),
);

router.get(
  '/:id',
  requireAnyPermission('marks:read:own', 'marks:read:class', 'marks:read:any'),
  validateParams(markIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.getMark(req.user!, id));
  }),
);

router.patch(
  '/:id',
  requireAnyPermission('marks:write:class', 'marks:write:any'),
  validateParams(markIdParamDto),
  validateBody(updateMarkDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.updateMark(req.user!, id, req.body));
  }),
);

router.delete(
  '/:id',
  requirePermission('marks:write:any'),
  validateParams(markIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    await markService.deleteMark(req.user!, id);
    sendSuccess(res, null, 204);
  }),
);

export default router;
