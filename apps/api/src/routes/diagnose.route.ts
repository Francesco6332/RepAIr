import { Router } from 'express';
import { z } from 'zod';
import { generatePrediagnosis } from '../services/diagnosis.service';

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  mileage: z.number().int().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng']).optional()
});

const schema = z.object({
  mode: z.enum(['text', 'image', 'audio']),
  prompt: z.string().min(3),
  vehicle: vehicleSchema,
  region: z.string().optional(),
  language: z.enum(['it', 'en']).optional()
});

export const diagnoseRouter = Router();

diagnoseRouter.post('/', async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const data = await generatePrediagnosis({
    prompt: parse.data.prompt,
    vehicle: parse.data.vehicle,
    region: parse.data.region,
    language: parse.data.language
  });

  return res.json(data);
});
