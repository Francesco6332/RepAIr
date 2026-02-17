import { NextFunction, Request, Response } from 'express';

export function mockAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = req.header('x-user-id') ?? 'anon-user';
  next();
}
