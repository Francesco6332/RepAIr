import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { env } from './config/env';
import { runReminderJob } from './jobs/reminderJob';
import { supabaseAuth } from './middleware/supabaseAuth';
import { freePlanQuota } from './middleware/quota';
import { diagnoseRouter } from './routes/diagnose.route';
import { mechanicsRouter } from './routes/mechanics.route';
import { healthRouter } from './routes/health.route';
import { mediaRouter } from './routes/media.route';
import { costsRouter } from './routes/costs.route';
import { dtcRouter } from './routes/dtc.route';
import { followUpRouter } from './routes/followup.route';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRouter);
app.use('/api/diagnose', supabaseAuth, freePlanQuota(), diagnoseRouter);
app.use('/api/mechanics', supabaseAuth, mechanicsRouter);
app.use('/api/media', supabaseAuth, freePlanQuota(), mediaRouter);
app.use('/api/costs', supabaseAuth, costsRouter);
app.use('/api/dtc', supabaseAuth, freePlanQuota(), dtcRouter);
app.use('/api/diagnose/followup', supabaseAuth, freePlanQuota(), followUpRouter);

app.listen(env.port, () => {
  console.log(`RepAIro API listening on http://localhost:${env.port}`);
});

// Daily reminder: 10:00 AM UTC
cron.schedule('0 10 * * *', () => {
  runReminderJob().catch((e) => console.error('[reminderJob] failed:', e));
});
