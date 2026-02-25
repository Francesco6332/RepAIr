# RepAIro

RepAIro is a mobile-first AI prediagnosis platform for car owners.

## Included apps

- `apps/mobile`: Expo React Native app (iOS + Android)
- `apps/api`: Node.js API (Express + TypeScript)
- `packages/shared`: shared domain types
- `supabase/schema.sql`: full DB schema + RLS
- `supabase/seed.sql`: starter repair costs, DTC data, authorized workshops

## Fully implemented in this scaffold

- Supabase auth in mobile (sign up, sign in, sign out)
- Vehicles management screen (add/list/select vehicle)
- Text diagnosis endpoint integration
- Camera/gallery photo diagnosis flow integration
- Audio recording diagnosis flow integration
- Nearby mechanics endpoint with OpenStreetMap (Overpass) integration + fallback
- Authorized-brand dealer prioritization
- Cost estimate endpoint
- Liquid-glass modern automotive UI + theme presets

## Environment setup

### API: `apps/api/.env`

```env
PORT=8787
NODE_ENV=development
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
DIAGNOSES_RETENTION_DAYS=30
SUPABASE_JWT_SECRET=
```

OpenAI is now the primary model provider for diagnosis.
Anthropic is optional backup.
Nearby mechanics are fetched from OpenStreetMap/Overpass (no paid Maps key required).

### Mobile: `apps/mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8787
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Use LAN IP for Android/iOS devices on the same network.

## Supabase setup

1. Create a Supabase project.
2. In SQL editor run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. In project settings copy:
- Project URL -> `EXPO_PUBLIC_SUPABASE_URL`
- Anon key -> `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- JWT secret -> `SUPABASE_JWT_SECRET`

## Install and run

```bash
npm install
```

Start API:

```bash
npm run dev:api
```

Start mobile:

```bash
npm run dev:mobile
```

In Expo terminal press:
- `a` for Android emulator
- `i` for iOS simulator
- or scan QR with Expo Go

## Zero-fixed-cost mode

- Works without fixed infra cost using free tiers
- If `OPENAI_API_KEY` is empty, API falls back to Anthropic (if configured) then rule-based diagnosis
- Mechanics search uses OpenStreetMap by default; if OSM query fails, fallback list is returned

## Important disclaimer

RepAIro returns a prediagnosis only. It does not replace certified mechanical inspection.
