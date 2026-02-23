import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export async function supabaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!bearer) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        apikey: env.supabaseAnonKey
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = (await response.json()) as { id?: string };
    if (!user.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = user.id;
    req.userToken = bearer;
    return next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
