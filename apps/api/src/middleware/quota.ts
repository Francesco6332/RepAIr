import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const FREE_MONTHLY_LIMIT = 20;

type Profile = {
  plan: 'free' | 'pro' | 'pro_plus';
  diagnoses_this_month: number;
  diagnoses_reset_at: string;
};

function isNewMonth(resetAt: string): boolean {
  const reset = new Date(resetAt);
  const now = new Date();
  return reset.getFullYear() !== now.getFullYear() || reset.getMonth() !== now.getMonth();
}

async function fetchProfile(userId: string, token: string): Promise<Profile | null> {
  const url = `${env.supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=plan,diagnoses_this_month,diagnoses_reset_at&limit=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.supabaseAnonKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Profile[];
  return rows[0] ?? null;
}

async function patchProfile(userId: string, token: string, patch: Partial<Profile>): Promise<void> {
  const url = `${env.supabaseUrl}/rest/v1/profiles?id=eq.${userId}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
}

export function freePlanQuota() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const userToken = req.userToken;

    if (!userId || !userToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const profile = await fetchProfile(userId, userToken);

      if (!profile) {
        // Can't read profile — fail open to not block legitimate users
        return next();
      }

      // Pro users: unlimited
      if (profile.plan === 'pro' || profile.plan === 'pro_plus') {
        return next();
      }

      // Free plan: check monthly limit
      if (isNewMonth(profile.diagnoses_reset_at)) {
        // New month — reset counter and allow
        await patchProfile(userId, userToken, {
          diagnoses_this_month: 1,
          diagnoses_reset_at: new Date().toISOString(),
        });
        return next();
      }

      if (profile.diagnoses_this_month >= FREE_MONTHLY_LIMIT) {
        return res.status(429).json({
          error: 'Monthly free quota reached. Upgrade to Pro for unlimited diagnoses.',
          limit: FREE_MONTHLY_LIMIT,
          used: profile.diagnoses_this_month,
        });
      }

      // Increment and allow
      await patchProfile(userId, userToken, {
        diagnoses_this_month: profile.diagnoses_this_month + 1,
      });
      return next();
    } catch {
      // If the quota check itself fails, fail open
      return next();
    }
  };
}
