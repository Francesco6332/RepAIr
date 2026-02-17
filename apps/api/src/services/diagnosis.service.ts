import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PrediagnosisResult, VehicleContext } from '@repairo/shared';
import { env } from '../config/env';

const anthropicClient = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;
const openaiClient = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

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

function sanitizeResult(input: Partial<PrediagnosisResult>, prompt: string): PrediagnosisResult {
  const fallback = ruleBasedFallback(prompt);
  const urgency = input.urgency;

  return {
    probableIssue: input.probableIssue?.trim() || fallback.probableIssue,
    confidence:
      typeof input.confidence === 'number' && Number.isFinite(input.confidence)
        ? Math.min(0.99, Math.max(0.05, input.confidence))
        : fallback.confidence,
    urgency: urgency === 'low' || urgency === 'medium' || urgency === 'high' ? urgency : fallback.urgency,
    estimatedCostMin:
      typeof input.estimatedCostMin === 'number' && Number.isFinite(input.estimatedCostMin)
        ? Math.max(0, Math.round(input.estimatedCostMin))
        : fallback.estimatedCostMin,
    estimatedCostMax:
      typeof input.estimatedCostMax === 'number' && Number.isFinite(input.estimatedCostMax)
        ? Math.max(0, Math.round(input.estimatedCostMax))
        : fallback.estimatedCostMax,
    safetyAdvice: input.safetyAdvice?.trim() || fallback.safetyAdvice,
    nextChecks: Array.isArray(input.nextChecks)
      ? input.nextChecks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : fallback.nextChecks,
    disclaimer:
      input.disclaimer?.trim() ||
      'Prediagnosis only. A certified mechanic must verify the issue.'
  };
}

function buildPrompt(input: { prompt: string; vehicle: VehicleContext; region?: string }) {
  return `Vehicle: ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year}, mileage ${input.vehicle.mileage ?? 'unknown'}\nFuel: ${input.vehicle.fuelType ?? 'unknown'}\nRegion: ${input.region ?? 'unknown'}\nSymptom: ${input.prompt}`;
}

async function openAiPrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
}): Promise<PrediagnosisResult | null> {
  if (!openaiClient) return null;

  const system =
    'You are RepAIro, an automotive prediagnosis assistant. Return valid JSON only with keys: probableIssue, confidence, urgency, estimatedCostMin, estimatedCostMax, safetyAdvice, nextChecks, disclaimer. urgency must be low|medium|high. confidence is 0..1. Include a legal disclaimer that this is not a certified inspection.';

  const completion = await openaiClient.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: buildPrompt(input) }
    ]
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PrediagnosisResult>;
    return sanitizeResult(parsed, input.prompt);
  } catch {
    return null;
  }
}

async function anthropicPrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
}): Promise<PrediagnosisResult | null> {
  if (!anthropicClient) return null;

  const system =
    'You are RepAIro, an automotive prediagnosis assistant. Reply with a single valid JSON object — no markdown, no explanation — with exactly these keys: probableIssue (string), confidence (0..1 float), urgency ("low"|"medium"|"high"), estimatedCostMin (integer), estimatedCostMax (integer), safetyAdvice (string), nextChecks (string[]), disclaimer (string). Never claim certainty.';

  const res = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: buildPrompt(input) }]
  });

  const text = res.content.find((c) => c.type === 'text' && 'text' in c)?.text;
  if (!text) return null;

  try {
    // Extract JSON even if Claude wraps it in a code block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<PrediagnosisResult>;
    return sanitizeResult(parsed, input.prompt);
  } catch {
    return null;
  }
}

export async function analyzeImageWithVision(input: {
  imageBase64: string;
  mimeType: string;
  vehicle: VehicleContext;
  region?: string;
}): Promise<PrediagnosisResult> {
  const vehicleDesc = `${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year} (${input.vehicle.fuelType ?? 'unknown fuel'}, ${input.vehicle.mileage ?? 'unknown'} km)`;
  const userText = `Vehicle: ${vehicleDesc}. Region: ${input.region ?? 'unknown'}. Examine this photo carefully and diagnose any visible car issues.`;

  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are RepAIro, an automotive prediagnosis assistant. Analyze the car image and return valid JSON with keys: probableIssue, confidence, urgency, estimatedCostMin, estimatedCostMax, safetyAdvice, nextChecks, disclaimer. urgency must be low|medium|high. confidence is 0..1.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${input.mimeType};base64,${input.imageBase64}`,
                  detail: 'low'
                }
              },
              { type: 'text', text: userText }
            ]
          }
        ]
      });
      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PrediagnosisResult>;
        return sanitizeResult(parsed, userText);
      }
    } catch {
      // fall through to Anthropic
    }
  }

  if (anthropicClient) {
    try {
      const res = await anthropicClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:
          'You are RepAIro, an automotive prediagnosis assistant. Reply with a single valid JSON object — no markdown, no explanation — with exactly these keys: probableIssue (string), confidence (0..1 float), urgency ("low"|"medium"|"high"), estimatedCostMin (integer), estimatedCostMax (integer), safetyAdvice (string), nextChecks (string[]), disclaimer (string). Never claim certainty.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: input.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: input.imageBase64
                }
              },
              { type: 'text', text: userText }
            ]
          }
        ]
      });
      const text = res.content.find((c) => c.type === 'text' && 'text' in c)?.text;
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<PrediagnosisResult>;
          return sanitizeResult(parsed, userText);
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  return ruleBasedFallback('car image analysis');
}

export async function generatePrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
}): Promise<PrediagnosisResult> {
  try {
    const openAi = await openAiPrediagnosis(input);
    if (openAi) return openAi;
  } catch {
    // fall through to Anthropic/fallback
  }

  try {
    const anthropic = await anthropicPrediagnosis(input);
    if (anthropic) return anthropic;
  } catch {
    // fall through to fallback
  }

  return ruleBasedFallback(input.prompt);
}
