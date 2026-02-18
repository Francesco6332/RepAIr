import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_DAILY_LIMIT = 5;

const USAGE_KEY = '@repairo/usage_v1';
const PLAN_KEY = '@repairo/plan_v1';

export type Plan = 'free' | 'pro';

// ─── Plan ────────────────────────────────────────────────────────────────────

export async function getCurrentPlan(): Promise<Plan> {
  const val = await AsyncStorage.getItem(PLAN_KEY);
  return (val as Plan) ?? 'free';
}

export async function setPlan(plan: Plan): Promise<void> {
  await AsyncStorage.setItem(PLAN_KEY, plan);
}

// ─── Usage ────────────────────────────────────────────────────────────────────

type UsageRecord = { date: string; count: number };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readRecord(): Promise<UsageRecord> {
  const raw = await AsyncStorage.getItem(USAGE_KEY);
  return raw ? (JSON.parse(raw) as UsageRecord) : { date: '', count: 0 };
}

/** Returns how many diagnoses remain today for a free-plan user. */
export async function getRemainingDiagnoses(): Promise<number> {
  const plan = await getCurrentPlan();
  if (plan !== 'free') return Infinity;
  const record = await readRecord();
  if (record.date !== todayStr()) return FREE_DAILY_LIMIT;
  return Math.max(0, FREE_DAILY_LIMIT - record.count);
}

/** Returns how many diagnoses were used today. */
export async function getUsedToday(): Promise<number> {
  const record = await readRecord();
  if (record.date !== todayStr()) return 0;
  return record.count;
}

/**
 * Tries to consume one diagnosis slot.
 * Returns allowed=false if the daily free limit is hit.
 */
export async function consumeDiagnosis(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const plan = await getCurrentPlan();
  if (plan !== 'free') return { allowed: true, remaining: Infinity };

  const today = todayStr();
  const record = await readRecord();

  if (record.date !== today) {
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ date: today, count: 1 }));
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  if (record.count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = record.count + 1;
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
  return { allowed: true, remaining: FREE_DAILY_LIMIT - newCount };
}
