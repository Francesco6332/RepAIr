import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PrediagnosisResult, VehicleContext } from '@repairo/shared';
import { env } from '../config/env';

const anthropicClient = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;
const openaiClient = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

type AppLanguage = 'it' | 'en';

function normalizeLanguage(language?: string): AppLanguage {
  return language === 'it' ? 'it' : 'en';
}

function sanitizeResult(input: Partial<PrediagnosisResult>, language: AppLanguage): PrediagnosisResult {
  const urgency = input.urgency;
  const canDrive = input.canDrive;
  const defaults = language === 'it'
    ? {
        probableIssue: 'Impossibile determinare il problema',
        safetyAdvice: 'Consulta un meccanico certificato.',
        disclaimer: 'Pre-diagnosi AI. Deve essere verificata da un meccanico certificato.',
      }
    : {
        probableIssue: 'Unable to determine the issue',
        safetyAdvice: 'Consult a certified mechanic.',
        disclaimer: 'AI pre-diagnosis. It must be verified by a certified mechanic.',
      };

  return {
    probableIssue: input.probableIssue?.trim() || defaults.probableIssue,
    confidence:
      typeof input.confidence === 'number' && Number.isFinite(input.confidence)
        ? Math.min(0.99, Math.max(0.05, input.confidence))
        : 0.5,
    urgency: urgency === 'low' || urgency === 'medium' || urgency === 'high' ? urgency : 'medium',
    estimatedCostMin:
      typeof input.estimatedCostMin === 'number' && Number.isFinite(input.estimatedCostMin)
        ? Math.max(0, Math.round(input.estimatedCostMin))
        : 0,
    estimatedCostMax:
      typeof input.estimatedCostMax === 'number' && Number.isFinite(input.estimatedCostMax)
        ? Math.max(0, Math.round(input.estimatedCostMax))
        : 0,
    safetyAdvice: input.safetyAdvice?.trim() || defaults.safetyAdvice,
    nextChecks: Array.isArray(input.nextChecks)
      ? input.nextChecks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : [],
    disclaimer:
      input.disclaimer?.trim() || defaults.disclaimer,
    // Extended fields
    canDrive: canDrive === 'yes' || canDrive === 'with_caution' || canDrive === 'no' ? canDrive : undefined,
    topCauses: Array.isArray(input.topCauses)
      ? input.topCauses
          .filter((c): c is { cause: string; confidence: number } =>
            typeof c === 'object' && typeof c.cause === 'string' && typeof c.confidence === 'number'
          )
          .slice(0, 3)
      : undefined,
    userChecks: Array.isArray(input.userChecks)
      ? input.userChecks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : undefined,
    ignoreRisks: input.ignoreRisks?.trim() || undefined,
    estimatedTimeMin:
      typeof input.estimatedTimeMin === 'number' && Number.isFinite(input.estimatedTimeMin)
        ? Math.max(0, input.estimatedTimeMin)
        : undefined,
    estimatedTimeMax:
      typeof input.estimatedTimeMax === 'number' && Number.isFinite(input.estimatedTimeMax)
        ? Math.max(0, input.estimatedTimeMax)
        : undefined,
    mechanicQuestions: Array.isArray(input.mechanicQuestions)
      ? input.mechanicQuestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : undefined,
  };
}

function buildPrompt(input: { prompt: string; vehicle: VehicleContext; region?: string }) {
  return `Vehicle: ${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year}, mileage ${input.vehicle.mileage ?? 'unknown'}\nFuel: ${input.vehicle.fuelType ?? 'unknown'}\nRegion: ${input.region ?? 'unknown'}\nSymptom: ${input.prompt}`;
}

function buildStructuredReportSystem(language: AppLanguage): string {
  const langName = language === 'it' ? 'Italian' : 'English';
  return (
    `You are RepAIro, a professional automotive pre-diagnosis assistant for ${langName}-speaking users. ` +
    'Return valid JSON only with these exact keys: ' +
    `probableIssue (string, main diagnosis in ${langName}), ` +
    'confidence (float 0..1, overall confidence), ' +
    'urgency ("low"|"medium"|"high"), ' +
    'canDrive ("yes"|"with_caution"|"no", whether the user can safely drive now), ' +
    `topCauses (array of up to 3 objects {cause: string, confidence: float}, most probable causes in ${langName}), ` +
    'estimatedCostMin (integer EUR), ' +
    'estimatedCostMax (integer EUR), ' +
    'estimatedTimeMin (integer, repair hours), ' +
    'estimatedTimeMax (integer, repair hours), ' +
    `safetyAdvice (string, immediate safety advice in ${langName}), ` +
    `userChecks (string array of 3-5 things user can verify themselves in 5 minutes, in ${langName}), ` +
    `nextChecks (string array of up to 5 checks a mechanic must perform, in ${langName}), ` +
    `ignoreRisks (string, what happens if this problem is ignored, in ${langName}), ` +
    `mechanicQuestions (string array of 3-5 questions to ask the mechanic, in ${langName}), ` +
    `disclaimer (string, legal disclaimer in ${langName}). ` +
    `Never claim certainty. All text must be in ${langName}.`
  );
}

async function openAiPrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
  language?: string;
}): Promise<PrediagnosisResult | null> {
  if (!openaiClient) return null;

  const language = normalizeLanguage(input.language);
  const system = buildStructuredReportSystem(language);

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
    return sanitizeResult(parsed, language);
  } catch {
    return null;
  }
}

async function anthropicPrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
  language?: string;
}): Promise<PrediagnosisResult | null> {
  if (!anthropicClient) return null;

  const language = normalizeLanguage(input.language);
  const system = buildStructuredReportSystem(language) + ' Reply with a single valid JSON object — no markdown, no code blocks, no explanation.';

  const res = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
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
    return sanitizeResult(parsed, language);
  } catch {
    return null;
  }
}

export async function analyzeImageWithVision(input: {
  imageBase64: string;
  mimeType: string;
  vehicle: VehicleContext;
  region?: string;
  language?: string;
}): Promise<PrediagnosisResult> {
  const language = normalizeLanguage(input.language);
  const system = buildStructuredReportSystem(language);
  const vehicleDesc = `${input.vehicle.make} ${input.vehicle.model} ${input.vehicle.year} (${input.vehicle.fuelType ?? 'unknown fuel'}, ${input.vehicle.mileage ?? 'unknown'} km)`;
  const userText = `Vehicle: ${vehicleDesc}. Region: ${input.region ?? 'unknown'}. Examine this photo carefully and diagnose any visible car issues.`;

  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: system
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
        return sanitizeResult(parsed, language);
      }
    } catch {
      // fall through to Anthropic
    }
  }

  if (anthropicClient) {
    try {
      const res = await anthropicClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: system + ' Reply with a single valid JSON object — no markdown, no code blocks, no explanation.',
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
          return sanitizeResult(parsed, language);
        }
      }
    } catch {
      // fall through to fallback
    }
  }

  throw new Error('No AI provider available to analyze the image.');
}

export async function generatePrediagnosis(input: {
  prompt: string;
  vehicle: VehicleContext;
  region?: string;
  language?: string;
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

  throw new Error('No AI provider available to generate a diagnosis.');
}
