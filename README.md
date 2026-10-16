# Form

A responsive fitness diary with health tracking, calendar scheduling, Supabase authentication, persistent workouts, reusable routines/recipes, a Norwegian food library, macro goals, historical snapshots and progress charts. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Supabase, and Recharts.

**Private diaries need a configured, migrated Supabase project or local stack.** Without one, private pages show setup instructions and authentication stays disabled. Workouts, nutrition, health, dashboard and calendar use actual persisted records. Community remains a labeled demo. Legacy previews live under `/demo/dashboard`, `/demo/calendar`, `/demo/workouts`, `/demo/progress` and `/demo/nutrition`. No live request silently falls back to demo data. Hosted Supabase authentication, persistence, and isolation verification has passed alongside the independent PostgreSQL tests.

## Run locally

Use Node.js 24 LTS (the runtime is pinned to 24.x) and npm. From this directory:

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Public demos and setup instructions need no environment file. To use the private diaries, follow [authentication/database setup](docs/SETUP.md): start Supabase, apply pending migrations, fill `.env.local`, restart, sign up, confirm your email, and log in.

```powershell
npm run lint
npm run typecheck
npm test
npm run test:ui
npm run test:postgres
npm run build
npm start
```

`npm start` serves the production build; stop the dev server first if port 3000 is in use. The lockfile pins the resolved stable dependencies. `npm run format` formats source and documentation.

Browser checks:

```powershell
npx playwright install chromium
npm run test:e2e
```

The browser suite builds the app, starts an isolated production server on port 3100, and checks public demos, anonymous protection, keyboard access, 404s, and mobile/desktop layout. Its live authenticated workflow cases explicitly skip without test credentials. PGlite tests need no database server. Native PostgreSQL tests create their own temporary SCRAM-protected cluster and require PostgreSQL 17 binaries; they never connect to an existing database. UI tests use a mocked transport and are not called live persistence verification.

## Configure live persistence

Start Docker Desktop and use the Supabase CLI:

```powershell
npx supabase start
npx supabase migration up --local
```

Apply pending migrations rather than resetting existing data. Copy `.env.example` to the ignored `.env.local`, fill the URL and public publishable/anon key, and keep `NEXT_PUBLIC_SITE_URL` aligned with your auth redirect allowlist. Never use a secret/service-role key. Twenty common exercises are seeded by migration; accounts and personal records are never seeded. Full local/hosted setup and confirmation instructions are in [SETUP.md](docs/SETUP.md).

To run real Supabase authentication/API isolation and browser persistence checks, create two confirmed test accounts and put only their test credentials in the ignored `.env.test.local` as documented in SETUP.md. Run `npm run test:supabase` and `npm run test:e2e`. These checks do not fabricate identities or turn success into mocks when Supabase is absent.

The configured hosted Supabase project is migrated through 009, the 2,121-food Norwegian cache is populated, and Phases 2-4 are verified: actual signup/email confirmation, login/refresh/logout, persistent workout/nutrition CRUD, independent recipe snapshots, goals, fresh-browser history/progress, and two-user ownership isolation. Verification fixtures were removed and no credentials are committed. Repeat with `npm run audit:hosted` and `npm run test:hosted` using an authorized linked CLI; see SETUP.md.

## Repository map

- `AGENTS.md`: persistent engineering and security rules.
- `docs/ARCHITECTURE.md`: entity model, historical integrity, security, extension points, known lifecycle gaps.
- `docs/PLAN.md`: completed implementation and hosted verification, and Phase 4 health/calendar scope.
- `docs/SETUP.md`: exact local/hosted configuration and real test-account instructions.
- `docs/HEALTH-CALENDAR.md`: health logging, goals, recurrence, DST, fulfillment and limits.
- `docs/NUTRITION.md`: nutrition calculations, snapshots, trusted food imports and limitations.
- `src/app`: App Router pages, shared layout, CSS, error/loading states.
- `src/components`: responsive shell, dashboard, module demos, charts, reusable UI primitives.
- `src/lib/demo`: isolated fictional fixtures.
- `src/lib/supabase`: typed server-only SSR data access and generated database types.
- `src/lib/training`: strength validation, domain types, calculations and repository.
- `src/lib/nutrition`: food/feed normalization, serving/recipe calculations, validation and authenticated repository.
- `src/proxy.ts`: cookie session refresh and private cache policy.
- `supabase/migrations`: schema and security migrations; no hosted connection needed.
- `tests`: PostgreSQL invariant/RLS/persistence tests, pure domain tests, UI tests, real Supabase API integration, and browser checks.

## Dependency security

The initial audit reports no production vulnerabilities. The development lint chain has a `braces` stack-exhaustion advisory via Next's ESLint plugin and `fast-glob`; the registry currently has no patched compatible `braces` release. Do not apply npm's suggested major downgrade to Next's lint config. Only trusted local repository paths are linted. Recheck `npm audit` and upgrade the lint chain when a compatible fix is available. This tooling advisory remains an open maintenance item.

## Assignment deployment

Live application: [Form on Vercel](https://form-dave3625-ma3.vercel.app), corrected release `3cc9c25`. Independent production acceptance passed three API scenarios and 28 desktop/mobile browser cases. Dedicated confirmation regression passed locally and on production desktop/mobile using generated links. New emails use `/auth/confirm`, which clears URL tokens and verifies email status with Supabase before success. Real inbox confirmation needs a fresh manual retest; existing authorized accounts are the chosen demonstration setup. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for results/limits and [SUBMISSION.md](docs/SUBMISSION.md) for assignment details, AI disclosure and demonstration steps. Community, scanning and wearable synchronization remain deferred.
