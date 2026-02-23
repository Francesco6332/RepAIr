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
  region: z.string().optional()
});

function buildSystem(vehicle: VehicleContext, region?: string): string {
  return `You are RepAIro, an automotive prediagnosis AI continuing a diagnostic conversation.
Vehicle: ${vehicle.make} ${vehicle.model} ${vehicle.year}, ${vehicle.fuelType ?? 'unknown'} fuel, ${vehicle.mileage ?? 'unknown'} km. Region: ${region ?? 'unknown'}.
Based on the conversation, either ask ONE concise clarifying question to narrow the diagnosis, or provide a refined prediagnosis if you have enough information.
Return valid JSON with exactly two keys:
- "message": string — your response (max 3 sentences, plain text, no markdown)
- "diagnosis": object — updated prediagnosis with keys: probableIssue, confidence (0–1 float), urgency ("low"|"medium"|"high"), estimatedCostMin (int), estimatedCostMax (int), safetyAdvice, nextChecks (string[]), disclaimer`;
}

function sanitize(raw: Record<string, unknown>): PrediagnosisResult {
  const d = (raw?.diagnosis ?? raw) as Record<string, unknown>;
  const urgency = d?.urgency as string;
  return {
    probableIssue: String(d?.probableIssue ?? 'Under investigation').trim(),
    confidence:
      typeof d?.confidence === 'number'
        ? Math.min(0.99, Math.max(0.05, d.confidence))
        : 0.5,
    urgency: urgency === 'low' || urgency === 'medium' || urgency === 'high' ? urgency : 'medium',
    estimatedCostMin:
      typeof d?.estimatedCostMin === 'number' ? Math.max(0, Math.round(d.estimatedCostMin)) : 0,
    estimatedCostMax:
      typeof d?.estimatedCostMax === 'number' ? Math.max(0, Math.round(d.estimatedCostMax)) : 0,
    safetyAdvice: String(d?.safetyAdvice ?? 'Please consult a certified mechanic.').trim(),
    nextChecks: Array.isArray(d?.nextChecks)
      ? (d.nextChecks as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 5)
      : [],
    disclaimer: String(d?.disclaimer ?? 'Prediagnosis only. A certified mechanic must verify the issue.').trim()
  };
}

export const followUpRouter = Router();

followUpRouter.post('/', async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { messages, vehicle, region } = parse.data;
  const system = buildSystem(vehicle, region);
  const history = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));

  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: env.openaiModel,
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, ...history]
      });
      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return res.json({
          message: String(parsed.message ?? 'Can you give me more details?'),
          diagnosis: sanitize(parsed.diagnosis as Record<string, unknown> ?? {})
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
        max_tokens: 800,
        system,
        messages: history
      });
      const text = response.content.find((c) => c.type === 'text' && 'text' in c)?.text;
      if (text) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as Record<string, unknown>;
          return res.json({
            message: String(parsed.message ?? 'Can you give me more details?'),
            diagnosis: sanitize(parsed.diagnosis as Record<string, unknown> ?? {})
          });
        }
      }
    } catch {
      // fall through
    }
  }

  throw new Error('No AI provider available for follow-up.');
});
