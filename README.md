# FORM

A private fitness diary and an experiment in AI-assisted application development.

**OsloMet · DAVE3625 · Mandatory Assignment 3**

**[Live application](https://form-dave3625-ma3.vercel.app)** · [GitHub repository](https://github.com/BuzzDot/DAVE3625-MA3)

## Purpose and motivation

FORM brings workouts, nutrition and daily health measurements into one diary. The main objective was to explore how far generative AI could take a working application through external APIs, data processing and real-world integrations. Matvaretabellen, food barcode scanning and Garmin Connect provided three concrete experiments; the wider fitness features gave them a usable setting.

The project demonstrates the assignment's focus on an application idea, generative AI use, working functionality, testing and iteration.

## Delivered features

| Area                | Functionality                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Workouts            | Reusable routines, individual sets, workout history and progress charts.                            |
| Nutrition           | Norwegian food search, personal foods, recipes, quantity-based logging and dated macro goals.       |
| Health and calendar | Manual measurements, daily summaries, dated goals and recurring workout/meal plans.                 |
| Private accounts    | Supabase authentication, persistent records and database row-level security separating users' data. |

## AI-assisted development

ChatGPT and Codex supported brainstorming, architecture, code generation, debugging, tests and documentation. Prompts defined features and constraints; AI generated and revised the implementation through repeated feedback and verification.

Generated code was checked through automated tests and actual browser interactions. A reported phone-scanning failure exposed a limitation in the original native barcode approach, leading to JavaScript decoding and stronger camera tests. The process highlighted the importance of checking AI-generated assumptions against real devices, provider data and observable results.

## External data and experiments

| Experiment                                                     | Outcome and limits                                                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Matvaretabellen](https://www.matvaretabellen.no/)             | Norwegian food data is imported into FORM's food library with source references. Searches use this saved library.                                                                                |
| [Open Food Facts](https://world.openfoodfacts.org/) and camera | Scan or type a barcode to find a product, review its nutrition and confirm the amount consumed. Camera images stay on the device; unclear units are rejected and missing nutrients stay unknown. |
| Garmin Connect                                                 | A CSV prototype remains local and is excluded from production. Automatic sync was deferred because genuine API access was not verified.                                                          |

## Technology and verification

**Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn-style UI primitives and Recharts; Supabase Auth/PostgreSQL; Vercel hosting. Tests use Vitest/Testing Library, Playwright, PGlite and native PostgreSQL.

For deployed release `839c6a5`, recorded acceptance passed **22 desktop/mobile Chromium cases and three real Supabase API scenarios**, with no skips. Checks covered persistence, user isolation, barcode lookup, nutrition and workouts. Lint, type checks, production builds and domain/UI/SQL tests also passed. These release results exclude local Garmin experiments.

Camera automation decodes generated video. Manual iPhone Safari testing confirmed barcode scanning for both solid and liquid products in the latest production version. Fresh confirmation-email delivery remains unverified. Community is a demo; OCR and wearable synchronization remain future work.

## Run locally

Use **Node.js 24** and npm. Follow [database/auth setup](docs/SETUP.md) to configure a migrated Supabase instance and create `.env.local` from `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`. Use a public publishable key, never a service-role key.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), register, confirm your email and sign in. See the [user guide](docs/USER_GUIDE.md) for the main workflows.
