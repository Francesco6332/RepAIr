import { NextFunction, Request, Response } from 'express';

const dailyCounts = new Map<string, { date: string; count: number }>();

export function freePlanQuota(maxPerDay = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId ?? 'anon-user';
    const date = new Date().toISOString().slice(0, 10);
    const existing = dailyCounts.get(userId);

    if (!existing || existing.date !== date) {
      dailyCounts.set(userId, { date, count: 1 });
      return next();
    }

    if (existing.count >= maxPerDay) {
      return res.status(429).json({
        error: 'Daily free quota reached. Please retry tomorrow.',
        limit: maxPerDay
      });
    }

    existing.count += 1;
    return next();
  };
}
