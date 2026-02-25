import { Router } from 'express';
import { z } from 'zod';
import { analyzeImageWithVision, generatePrediagnosis } from '../services/diagnosis.service';

const vehicleSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  mileage: z.number().int().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng']).optional()
});

const imageSchema = z.object({
  vehicle: vehicleSchema,
  imageBase64: z.string().min(10),
  mimeType: z.string().default('image/jpeg'),
  region: z.string().optional(),
  language: z.enum(['it', 'en']).optional()
});

const audioSchema = z.object({
  vehicle: vehicleSchema,
  audioTranscript: z.string().min(3),
  region: z.string().optional(),
  language: z.enum(['it', 'en']).optional()
});

export const mediaRouter = Router();

mediaRouter.post('/analyze-photo', async (req, res) => {
  const parse = imageSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const data = await analyzeImageWithVision({
    imageBase64: parse.data.imageBase64,
    mimeType: parse.data.mimeType,
    vehicle: parse.data.vehicle,
    region: parse.data.region,
    language: parse.data.language
  });

  return res.json({
    ...data,
    inputType: 'photo',
    persistedFile: false
  });
});

mediaRouter.post('/analyze-audio', async (req, res) => {
  const parse = audioSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const data = await generatePrediagnosis({
    prompt: `Noise transcript: ${parse.data.audioTranscript}`,
    vehicle: parse.data.vehicle,
    region: parse.data.region,
    language: parse.data.language
  });

  return res.json({
    ...data,
    inputType: 'audio',
    persistedFile: false
  });
});
