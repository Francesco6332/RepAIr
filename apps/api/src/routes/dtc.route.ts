import { Router } from 'express';
import { z } from 'zod';
import { generatePrediagnosis } from '../services/diagnosis.service';
import { env } from '../config/env';

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  mileage: z.number().int().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng']).optional()
});

const schema = z.object({
  code: z
    .string()
    .min(4)
    .max(7)
    .regex(/^[PCBU][0-9]{4}$/i, 'Invalid OBD-II code format (e.g. P0420)')
    .transform((s) => s.trim().toUpperCase()),
  vehicle: vehicleSchema,
  region: z.string().optional(),
  language: z.enum(['it', 'en']).optional()
});

type DtcRecord = {
  code: string;
  description: string;
  common_causes: string[] | null;
  severity: string | null;
  avg_cost_min: number | null;
  avg_cost_max: number | null;
};

async function fetchDtcRecord(code: string): Promise<DtcRecord | null> {
  const url = `${env.supabaseUrl}/rest/v1/dtc_codes?code=eq.${encodeURIComponent(code)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: env.supabaseAnonKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as DtcRecord[];
  return rows[0] ?? null;
}

export const dtcRouter = Router();

dtcRouter.post('/lookup', async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { code, vehicle, region, language } = parse.data;

  const record = await fetchDtcRecord(code);

  const dbContext = record
    ? `Official description: "${record.description}". Common causes: ${(record.common_causes ?? []).join(', ')}.`
    : '';

  const prompt = `OBD-II diagnostic trouble code ${code} detected. ${dbContext} Provide a prediagnosis for this specific vehicle.`;

  const result = await generatePrediagnosis({ prompt, vehicle, region, language });

  return res.json(result);
});
