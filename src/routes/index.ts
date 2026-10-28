import { Router } from 'express';
import markController from '../modules/mark/mark.controller';
import studentController from '../modules/student/student.controller';
import userController from '../modules/user/user.controller';
import { curlResponse } from '../utils/http';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Register each feature module here (house rule: mount with curlResponse).
router.use('/users', curlResponse(userController));
router.use('/students', curlResponse(studentController));
router.use('/marks', curlResponse(markController));

/** Demo: an async handler that rejects. Proves the error is caught, not a process crash. */
router.get('/demo/async-error', async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error('Boom! Async failure inside a route');
});

export default router;
