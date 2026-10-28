import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Build a redacted curl snippet (never echo raw secrets). */
export const buildCurl = (req: Request): string => {
  const host = req.get('host') ?? 'localhost';
  const proto = req.protocol || 'http';
  const url = `${proto}://${host}${req.originalUrl}`;
  const parts = [`curl -s -X ${req.method.toUpperCase()} '${url}'`];

  const auth = req.get('authorization');
  if (auth) {
    parts.push(`-H 'Authorization: Bearer <redacted>'`);
  }

  const contentType = req.get('content-type');
  if (contentType) {
    parts.push(`-H 'Content-Type: ${contentType}'`);
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    const safe = { ...req.body } as Record<string, unknown>;
    if ('password' in safe) safe.password = '<redacted>';
    parts.push(`-d '${JSON.stringify(safe)}'`);
  }

  return parts.join(' \\\n  ');
};

/** Send a normal success response: { "data": ..., "curl": "..." } */
export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  if (status === 204) {
    res.status(204).end();
    return;
  }
  const req = res.req as Request;
  res.status(status).json({ data, curl: buildCurl(req) });
};

/** Mount a router/handler so async errors go to the error handler. */
export const curlResponse = (handler: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
};
