import { Router } from 'express';
import adminController from '../modules/admin/admin.controller';
import authController from '../modules/auth/auth.controller';
import markController from '../modules/mark/mark.controller';
import studentController from '../modules/student/student.controller';
import userController from '../modules/user/user.controller';
import { noStore } from '../middlewares/noStore';
import { curlResponse } from '../utils/http';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', noStore, curlResponse(authController));
router.use('/admin', noStore, curlResponse(adminController));
router.use('/users', curlResponse(userController));
router.use('/students', noStore, curlResponse(studentController));
router.use('/marks', noStore, curlResponse(markController));

/** Demo: an async handler that rejects. Proves the error is caught, not a process crash. */
router.get('/demo/async-error', async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Boom! Async failure inside a route');
});

export default router;
