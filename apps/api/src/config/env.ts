import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  diagnosesRetentionDays: Number(process.env.DIAGNOSES_RETENTION_DAYS ?? 30),
  appEnv: process.env.NODE_ENV ?? 'development'
};
