import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  mapsApiKey: process.env.MAPS_API_KEY,
  appEnv: process.env.NODE_ENV ?? 'development'
};
