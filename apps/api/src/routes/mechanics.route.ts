import { Router } from 'express';
import { z } from 'zod';
import { getNearbyMechanics } from '../services/mechanics.service';

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
  make: z.string().optional()
});

export const mechanicsRouter = Router();

mechanicsRouter.post('/nearby', async (req, res) => {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const data = await getNearbyMechanics(parse.data);
  return res.json(data);
});
