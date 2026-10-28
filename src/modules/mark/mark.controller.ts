import { Router, type Request, type Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { curlResponse, sendSuccess } from '../../utils/http';
import { averagesQueryDto, markIdParamDto, updateMarkDto } from './mark.dto';
import * as markService from './mark.service';

const router = Router();

/** Registered before /:id so "averages" is not parsed as an id. */
router.get(
  '/averages',
  validateQuery(averagesQueryDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await markService.getSubjectAverages(res.locals.query));
  }),
);

router.get(
  '/:id',
  validateParams(markIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.getMark(id));
  }),
);

router.patch(
  '/:id',
  validateParams(markIdParamDto),
  validateBody(updateMarkDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    sendSuccess(res, await markService.updateMark(id, req.body));
  }),
);

router.delete(
  '/:id',
  validateParams(markIdParamDto),
  curlResponse(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    await markService.deleteMark(id);
    sendSuccess(res, null, 204);
  }),
);

export default router;
