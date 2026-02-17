import { Router } from 'express';
import { z } from 'zod';

const schema = z.object({
  intervention: z.string().min(2),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  region: z.string().default('US')
});

export const costsRouter = Router();

costsRouter.post('/estimate', (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const map: Record<string, [number, number]> = {
    'brake pads': [120, 350],
    'battery replacement': [150, 420],
    'oil change': [60, 140]
  };

  const key = Object.keys(map).find((k) => parse.data.intervention.toLowerCase().includes(k));
  const [min, max] = key ? map[key] : [90, 900];

  return res.json({
    intervention: parse.data.intervention,
    estimatedCostMin: min,
    estimatedCostMax: max,
    currency: 'USD',
    note: 'Indicative prequote only. Prices vary by labor rate, region, and OEM parts.'
  });
});
