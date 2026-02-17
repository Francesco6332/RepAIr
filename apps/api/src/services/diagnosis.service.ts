import Anthropic from '@anthropic-ai/sdk';
import { PrediagnosisResult, VehicleContext } from '@repairo/shared';
import { env } from '../config/env';

const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

function ruleBasedFallback(prompt: string): PrediagnosisResult {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('brake') || normalized.includes('freno')) {
    return {
      probableIssue: 'Worn brake pads or rotor scoring',
      confidence: 0.82,
      urgency: 'medium',
      estimatedCostMin: 140,
      estimatedCostMax: 420,
      safetyAdvice: 'Avoid hard braking and schedule an inspection within a week.',
      nextChecks: ['Inspect pad thickness', 'Check rotor surface', 'Read ABS-related DTCs'],
      disclaimer: 'Prediagnosis only. A certified mechanic must verify the issue.'
    };
  }

  if (normalized.includes('engine light') || normalized.includes('check engine')) {
    return {
      probableIssue: 'Emissions or ignition system fault (DTC scan required)',
      confidence: 0.68,
      urgency: 'medium',
      estimatedCostMin: 90,
      estimatedCostMax: 650,
      safetyAdvice: 'Drive gently and scan OBD-II codes as soon as possible.',
      nextChecks: ['Scan DTC codes', 'Inspect spark plugs/coils', 'Inspect fuel trim readings'],
      disclaimer: 'Prediagnosis only. A certified mechanic must verify the issue.'
    };
  }

  return {
    probableIssue: 'General drivetrain or suspension anomaly',
    confidence: 0.53,
    urgency: 'low',
    estimatedCostMin: 120,
    estimatedCostMax: 900,
    safetyAdvice: 'Drive conservatively and book a local inspection.',
    nextChecks: ['Visual leak check', 'Suspension joints check', 'Full OBD scan'],
    disclaimer: 'Prediagnosis only. A certified mechanic must verify the issue.'
  };
}

export async function generatePrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
}): Promise<PrediagnosisResult> {
  if (!client) {
    return ruleBasedFallback(input.prompt);
  }

  const system = `You are RepAIro, an automotive prediagnosis assistant.\nYou must output strict JSON fields: probableIssue, confidence, urgency, estimatedCostMin, estimatedCostMax, safetyAdvice, nextChecks, disclaimer.\nUse urgency in [low, medium, high].\nNever claim certainty. Add disclaimer that this is not a certified inspection.`;

  const user = `Vehicle: ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year}, mileage ${input.vehicle.mileage ?? 'unknown'}\nRegion: ${input.region ?? 'unknown'}\nSymptom: ${input.prompt}`;

  const res = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: user }]
  });

  const text = res.content.find((c) => c.type === 'text' && 'text' in c)?.text;
  if (!text) {
    return ruleBasedFallback(input.prompt);
  }

  try {
    const parsed = JSON.parse(text) as PrediagnosisResult;
    return parsed;
  } catch {
    return ruleBasedFallback(input.prompt);
  }
}
