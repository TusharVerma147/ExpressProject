import { Router, type Request, type Response } from 'express';
import { validateBody } from '../../middlewares/validate';
import { curlResponse, sendSuccess } from '../../utils/http';
import { loginDto, registerDto } from './auth.dto';
import * as authService from './auth.service';

const router = Router();

router.post(
  '/register',
  validateBody(registerDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await authService.register(req.body), 201);
  }),
);

router.post(
  '/login',
  validateBody(loginDto),
  curlResponse(async (req: Request, res: Response) => {
    sendSuccess(res, await authService.login(req.body));
  }),
);

export default router;
