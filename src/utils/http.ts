import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Send a normal success response: { "data": ... } */
export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  if (status === 204) {
    res.status(204).end();
    return;
  }
  res.status(status).json({ data });
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
