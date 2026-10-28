import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFound';
import { rejectDangerousPayload } from './middlewares/rejectDangerousPayload';
import { requestLogger } from './middlewares/requestLogger';
import routes from './routes';

/**
 * Request lifecycle (middleware runs in registration order):
 *   cors -> requestLogger -> express.json -> rejectDangerousPayload -> /api routes -> notFound -> errorHandler
 */
const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }),
);
app.use(requestLogger);
app.use(express.json({ limit: '100kb' }));
app.use(rejectDangerousPayload);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
