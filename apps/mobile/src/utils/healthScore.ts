import { DiagnosisRecord } from '../services/diagnoses';

const URGENCY_PENALTY: Record<string, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 5,
};

function recencyFactor(createdAt: string): number {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (days < 7) return 1.0;
  if (days < 30) return 0.75;
  return 0.5;
}

export type HealthScore = {
  score: number;
  label: string;
  color: string;
};

export function computeHealthScore(records: DiagnosisRecord[]): HealthScore {
  const open = records
    .filter((r) => r.status === 'open')
    .slice(0, 8);

  const penalty = open.reduce((acc, r) => {
    const base = URGENCY_PENALTY[r.urgency ?? 'low'] ?? 5;
    return acc + base * recencyFactor(r.created_at);
  }, 0);

  const resolved30d = records.filter(
    (r) =>
      r.status === 'resolved' &&
      (Date.now() - new Date(r.created_at).getTime()) / 86_400_000 < 30
  ).length;
  const bonus = Math.min(resolved30d * 3, 10);

  const score = Math.round(Math.max(0, Math.min(100, 100 - penalty + bonus)));

  if (score >= 90) return { score, label: 'Excellent', color: '#34D399' };
  if (score >= 75) return { score, label: 'Good', color: '#4ADE80' };
  if (score >= 55) return { score, label: 'Fair', color: '#FBBF24' };
  if (score >= 35) return { score, label: 'Needs attention', color: '#FB923C' };
  return { score, label: 'Critical', color: '#F87171' };
}
