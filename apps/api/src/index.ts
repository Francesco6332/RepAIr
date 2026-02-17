import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { mockAuth } from './middleware/mockAuth';
import { freePlanQuota } from './middleware/quota';
import { diagnoseRouter } from './routes/diagnose.route';
import { mechanicsRouter } from './routes/mechanics.route';
import { healthRouter } from './routes/health.route';
import { mediaRouter } from './routes/media.route';
import { costsRouter } from './routes/costs.route';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(mockAuth);

app.use('/api/health', healthRouter);
app.use('/api/diagnose', freePlanQuota(20), diagnoseRouter);
app.use('/api/mechanics', freePlanQuota(40), mechanicsRouter);
app.use('/api/media', freePlanQuota(20), mediaRouter);
app.use('/api/costs', freePlanQuota(30), costsRouter);

app.listen(env.port, () => {
  console.log(`RepAIro API listening on http://localhost:${env.port}`);
});
