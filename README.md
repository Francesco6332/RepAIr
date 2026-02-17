# RepAIro

RepAIro is a mobile-first AI prediagnosis platform for car owners.

## What is included

- `apps/mobile`: Expo React Native app (iOS + Android)
- `apps/api`: Node.js API (Express + TypeScript)
- `packages/shared`: shared domain types
- `supabase/schema.sql`: full DB schema + RLS
- `supabase/seed.sql`: starter repair costs, DTC data, authorized workshops

## Core features in this MVP

- AI prediagnosis from prompt text
- Photo/audio diagnosis endpoints (no file persistence)
- Cost estimate endpoint
- Nearby mechanics endpoint with authorized workshop prioritization
- Automotive liquid-glass mobile UI
- Theme customization presets
- Free-plan daily quotas (in-memory middleware)

## Zero fixed cost strategy (MVP)

- Mobile app: Expo free workflow
- API hosting: serverless free tier (Vercel/Render/Fly free tier variant)
- Database/Auth: Supabase free tier
- Caching/rate limit: optional Upstash free tier
- AI: fallback rules when no API key is set; pay-per-use only when Anthropic key is enabled

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environments

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

### 3) Run API

```bash
npm run dev:api
```

### 4) Run mobile app

```bash
npm run dev:mobile
```

Then open with Expo Go for iOS/Android.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in SQL editor.
3. Run `supabase/seed.sql`.
4. Wire Supabase SDK into `apps/api` and `apps/mobile` for production auth/data.

## Important disclaimer

RepAIro returns a prediagnosis only. It does not replace certified mechanical inspection.
