import { Router } from 'express';
import { z } from 'zod';
import { generatePrediagnosis } from '../services/diagnosis.service';

const imageSchema = z.object({
  vehicle: z.object({
    make: z.string(),
    model: z.string(),
    year: z.number().int(),
    mileage: z.number().int().optional(),
    fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng']).optional()
  }),
  imageHint: z.string().min(3),
  region: z.string().optional()
});

const audioSchema = z.object({
  vehicle: imageSchema.shape.vehicle,
  audioTranscript: z.string().min(3),
  region: z.string().optional()
});

export const mediaRouter = Router();

mediaRouter.post('/analyze-photo', async (req, res) => {
  const parse = imageSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const data = await generatePrediagnosis({
    prompt: `Photo analysis context: ${parse.data.imageHint}`,
    vehicle: parse.data.vehicle,
    region: parse.data.region
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
    region: parse.data.region
  });

  return res.json({
    ...data,
    inputType: 'audio',
    persistedFile: false
  });
});
