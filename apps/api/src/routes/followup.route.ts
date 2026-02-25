import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrediagnosisResult, VehicleContext } from '@repairo/shared';
import { env } from '../config/env';

const openaiClient = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;
const anthropicClient = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  mileage: z.number().int().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng']).optional()
});

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
  vehicle: vehicleSchema,
  region: z.string().optional(),
  language: z.enum(['it', 'en']).optional()
});

type AppLanguage = 'it' | 'en';

function normalizeLanguage(language?: string): AppLanguage {
  return language === 'it' ? 'it' : 'en';
}

function buildSystem(vehicle: VehicleContext, region?: string, language: AppLanguage = 'en'): string {
  const langName = language === 'it' ? 'Italian' : 'English';
  return `You are RepAIro, an automotive pre-diagnosis AI continuing a diagnostic conversation in ${langName}.
Vehicle: ${vehicle.make} ${vehicle.model} ${vehicle.year}, ${vehicle.fuelType ?? 'unknown'} fuel, ${vehicle.mileage ?? 'unknown'} km. Region: ${region ?? 'unknown'}.
Based on the conversation, either ask ONE concise clarifying question to narrow the diagnosis, or provide a refined pre-diagnosis if you have enough information.
Return valid JSON with exactly two top-level keys:
- "message": string — your response in ${langName} (max 3 sentences, plain text, no markdown)
- "diagnosis": object — updated pre-diagnosis with these keys: probableIssue (string, ${langName}), confidence (0–1 float), urgency ("low"|"medium"|"high"), canDrive ("yes"|"with_caution"|"no"), topCauses (array of up to 3 {cause: string, confidence: float}), estimatedCostMin (int EUR), estimatedCostMax (int EUR), estimatedTimeMin (int hours), estimatedTimeMax (int hours), safetyAdvice (string, ${langName}), userChecks (string[] of 3-5 user actions, ${langName}), nextChecks (string[] of mechanic checks, ${langName}), ignoreRisks (string, ${langName}), mechanicQuestions (string[] of 3-5 questions, ${langName}), disclaimer (string, ${langName}).
All text must be in ${langName}. Never claim certainty.`;
}

function sanitize(raw: Record<string, unknown>, language: AppLanguage): PrediagnosisResult {
  const d = (raw?.diagnosis ?? raw) as Record<string, unknown>;
  const urgency = d?.urgency as string;
  const canDrive = d?.canDrive as string;
  const defaults = language === 'it'
    ? {
        probableIssue: 'In analisi',
        safetyAdvice: 'Consulta un meccanico certificato.',
        disclaimer: 'Pre-diagnosi AI. Deve essere verificata da un meccanico certificato.',
      }
    : {
        probableIssue: 'Under analysis',
        safetyAdvice: 'Consult a certified mechanic.',
        disclaimer: 'AI pre-diagnosis. It must be verified by a certified mechanic.',
      };
  return {
    probableIssue: String(d?.probableIssue ?? defaults.probableIssue).trim(),
    confidence:
      typeof d?.confidence === 'number'
        ? Math.min(0.99, Math.max(0.05, d.confidence))
        : 0.5,
    urgency: urgency === 'low' || urgency === 'medium' || urgency === 'high' ? urgency : 'medium',
    estimatedCostMin:
      typeof d?.estimatedCostMin === 'number' ? Math.max(0, Math.round(d.estimatedCostMin)) : 0,
    estimatedCostMax:
      typeof d?.estimatedCostMax === 'number' ? Math.max(0, Math.round(d.estimatedCostMax)) : 0,
    safetyAdvice: String(d?.safetyAdvice ?? defaults.safetyAdvice).trim(),
    nextChecks: Array.isArray(d?.nextChecks)
      ? (d.nextChecks as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 5)
      : [],
    disclaimer: String(d?.disclaimer ?? defaults.disclaimer).trim(),
    canDrive: canDrive === 'yes' || canDrive === 'with_caution' || canDrive === 'no' ? canDrive : undefined,
    topCauses: Array.isArray(d?.topCauses)
      ? (d.topCauses as unknown[])
          .filter((c): c is { cause: string; confidence: number } =>
            typeof c === 'object' && c !== null && typeof (c as any).cause === 'string' && typeof (c as any).confidence === 'number'
          )
          .slice(0, 3)
      : undefined,
    userChecks: Array.isArray(d?.userChecks)
      ? (d.userChecks as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 5)
      : undefined,
    ignoreRisks: typeof d?.ignoreRisks === 'string' ? d.ignoreRisks.trim() : undefined,
    estimatedTimeMin:
      typeof d?.estimatedTimeMin === 'number' && Number.isFinite(d.estimatedTimeMin)
        ? Math.max(0, d.estimatedTimeMin)
        : undefined,
    estimatedTimeMax:
      typeof d?.estimatedTimeMax === 'number' && Number.isFinite(d.estimatedTimeMax)
        ? Math.max(0, d.estimatedTimeMax)
        : undefined,
    mechanicQuestions: Array.isArray(d?.mechanicQuestions)
      ? (d.mechanicQuestions as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 5)
      : undefined,
  };
}

export const followUpRouter = Router();

followUpRouter.post('/', async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { messages, vehicle, region, language: rawLanguage } = parse.data;
  const language = normalizeLanguage(rawLanguage);
  const system = buildSystem(vehicle, region, language);
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));

  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: env.openaiModel,
        temperature: 0.3,
        max_tokens: 1100,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...history]
      });
        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const defaultMessage = language === 'it' ? 'Puoi darmi qualche dettaglio in piu?' : 'Can you give me more details?';
          return res.json({
            message: String(parsed.message ?? defaultMessage),
            diagnosis: sanitize(parsed.diagnosis as Record<string, unknown> ?? {}, language)
          });
        }
    } catch {
      // fall through
    }
  }

  if (anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1100,
        system,
        messages: history
      });
      const text = response.content.find((c) => c.type === 'text' && 'text' in c)?.text;
      if (text) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as Record<string, unknown>;
          const defaultMessage = language === 'it' ? 'Puoi darmi qualche dettaglio in piu?' : 'Can you give me more details?';
          return res.json({
            message: String(parsed.message ?? defaultMessage),
            diagnosis: sanitize(parsed.diagnosis as Record<string, unknown> ?? {}, language)
          });
        }
      }
    } catch {
      // fall through
    }
  }

  throw new Error('No AI provider available for follow-up.');
});
