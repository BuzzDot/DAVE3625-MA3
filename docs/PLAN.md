# Implementation plan

Updated October 16, 2026. A checked item means implemented and verified at its stated scope. Demo interactions do not count as production tracking.

## Phase 1 — Local foundation

- [x] Inspect workspace; initialize the empty directory without overwriting existing work. No Git repository was present; no commit or remote is created.
- [x] Next.js App Router, strict TypeScript, Tailwind, shadcn-style primitives, Recharts, Supabase client dependency, package scripts and lockfile.
- [x] Persistent `AGENTS.md`, architecture model, roadmap, startup/configuration documentation.
- [x] Responsive shared shell with seven navigable modules, loading/error/not-found presentation, accessible controls and explicit demo labels.
- [x] Dashboard fixtures; temporary demo workout set logging and summary; manual demo food entries and macro totals; date navigation and sample activities; metric chart selector; clear Community/Settings deferred states.
- [x] Separate fixtures and unused server-only Supabase boundary; no fake authentication, service keys, production writes, or required hosted connection.
- [x] Versioned relational migrations, RLS, grants, ownership-safe relationships, indexes, import deduplication, history snapshots, immutable program versions.
- [x] Offline SQL/security tests using PGlite.
- [x] Lint, strict typecheck, production build, and Prettier formatting check pass. All 9 PostgreSQL/RLS tests and all 12 Chromium browser tests pass (6 each at desktop/mobile sizes). Browser checks cover all seven routes, missing-page 404, no horizontal overflow, no uncaught page errors, keyboard skip navigation, bounded water additions, completed-set volume, food totals, date navigation, and chart selection. Dashboard screenshots reviewed at both sizes; local development startup verified.

Acceptance: all routes return successfully; build and checks pass; demo interactions work at mobile/desktop sizes; every table has RLS; unauthorized access and cross-owner references fail; template changes preserve recorded snapshots; app starts without environment variables.

## Phase 2 — Authentication, persistence, and strength training

- [x] Read existing instructions, architecture, roadmap, migrations, and code; preserve the phase-1 relational model and visual components.
- [x] Current `@supabase/ssr` cookie integration, Next.js proxy refresh, verified server identity, signup/login/PKCE confirmation/current-device logout, private routes and actionable setup/error states. Secret/service-role keys are rejected as public keys. No mock authentication or fixture fallback.
- [x] Typed server repository and schema types generated from actual migrated PostgreSQL 17 introspection. Owner-scoped, paginated reads avoid silently truncating history at the API row limit.
- [x] Forward-only migration 003 with 20 stable-ID common exercises, private exercise favorites, revision fields, routine target metadata, transactional invoker-security strength RPCs, and visibility guards.
- [x] Exercise search, muscle/equipment/favorite filtering, private custom exercises, stable identifiers, and favorites UI.
- [x] Create/edit/duplicate/archive routines; ordered exercises and intended sets/reps/optional weights, effort, and notes. Changes remain independent of recorded workouts.
- [x] Start from scratch/template with an immediately persisted draft; add/remove/reorder exercises and sets; warm-up/working/drop/failure types; reps/kg/RPE/RIR/notes; complete, review, edit, and delete own workouts.
- [x] Serialized 1.2-second autosave, database-confirmed status, explicit device recovery, optimistic concurrency errors, and latest-revision deletion. Device recovery is not an encrypted offline/background-sync system.
- [x] Timestamp/timezone validation, explicit UTC date-correction fields, prior exercise performance during logging, historical snapshot preservation, and real-data charts/history/volume/weight and estimated-1RM PRs. Calculation rules are documented and tested.
- [x] All migrations applied and validated in an isolated native PostgreSQL 17 cluster with generated SCRAM credentials. SQL tests verify real reconnect persistence, two-user RLS, unauthorized writes/RPCs, atomic rollback, snapshots, favorites, and stale revisions. This uses a simulated Supabase auth database boundary, not the Supabase Auth service.
- [x] PGlite/domain tests, editor/autosave UI tests with mocked transport, and anonymous/demo desktop/mobile browser checks added and run. Exact final check totals are recorded below.
- [x] Real Supabase Auth/API integration and authenticated browser workflow tests implemented with explicit credential-based skips; setup, migration, account, and test instructions documented in `SETUP.md`.
- [x] Hosted verification gate: safely linked the configured Supabase project, inspected its empty public schema, applied migrations 001-005 without reset, audited all 26 RLS-enabled tables and 34 policies, and ran real Auth/API and desktop/mobile authenticated browser workflows. Public signup and actual inbox confirmation were separately verified with the user-approved inbox; that temporary account was removed.

Acceptance met against hosted Supabase: real sign-in, routine creation, completed set logging, reload and fresh-browser history/progress, edits, deletion, refresh, and current-device logout. Another identity cannot read, mutate, delete, or reference private records. Template/catalog edits preserve historical snapshots.

Verification after hosted setup: lint, TypeScript, production build, formatting; 31 PGlite/domain tests, 17 native PostgreSQL tests, 10 UI tests, one real two-user Supabase API scenario, and 20 desktop/mobile browser tests. No configured browser cases skipped. Public signup/email confirmation/login/reload/logout also passed in a separate interactive browser check. Browser refresh forces local expiry metadata while retaining genuine signed tokens and validates renewal; it does not wait an entire JWT lifetime.

## Hosted verification fixes

- Migration 004 explicitly revokes hosted default grants on exercise favorites (including TRUNCATE), grants only authenticated SELECT/INSERT/DELETE, and guards reference changes on insert/update. The SQL harness now reproduces Supabase default privileges to prevent regression.
- Migration 005 replaces custom serialization error 40001 with HTTP conflict code PT409 in all three strength RPCs. Hosted PostgREST retried the former code instead of returning promptly. Existing deployed migrations were preserved; only functions/privileges changed.
- Fixed a browser test that navigated away before login completed. Missing owned records use Next.js streamed not-found UI, which may have already sent HTTP 200; tests assert denial content and absent private controls.
- Environment names match code; .env.local and CLI .temp are Git-ignored and untracked. CLI-authorized verification obtains temporary/admin credentials only in process memory; the application continues using ordinary authenticated RLS access.

## Phase 3 — Nutrition diary

Phase 3 implements the complete private nutrition diary against hosted Supabase while preserving Phase 2 strength workflows.

- [x] Norwegian food search/library, personal food create/edit/archive, favorites, reusable recipes with ingredients and fractional servings, and period-based goals.
- [x] Invoker-security recipe/diary RPCs, database-derived nutritional basis snapshots, quantity corrections, deletion, local dates/IANA zones, validation and clear save/error states.
- [x] Calculation, import, SQL, UI, hosted API and desktop/mobile browser tests; food/recipe edits and repeat source imports preserve historical nutrition.
- [x] Official Matvaretabellen feed investigated, schema-validated and imported twice: 2,121 cached Norwegian foods with stable source IDs, supported portions and selected additional nutrients; no duplicates or personal-data rewrites. Missing amounts stay null.
- [x] Daily calorie/macro totals and goal progress; dated targets and 30-recorded-day selectable macro charts; date navigation; live dashboard/calendar consumption summaries beside clearly labeled demo planning/metrics.
- [x] Forward migrations 006 and 007 applied without resets; 27 tables have RLS, 35 policies, and seven authenticated-only invoker RPCs. A pre-006 legacy fixture verifies migration preservation and rejects invented recalculation bases.
- [x] Existing strength tests retained; calorie/recipe snapshot attacks, cross-user reads/writes/deletes/references, fresh-browser persistence and mobile interaction checks run against the real hosted service.

Phase 3 verification: lint, strict TypeScript, production build, formatting; 46 domain/PGlite tests, 23 native PostgreSQL tests, 13 UI tests, two hosted API scenarios and 22 desktop/mobile browser cases. The first expanded mobile run found a calendar field hydration race; controlled nutrition fields now stay disabled until client handlers are ready, with focused SSR/UI regression coverage. The first official feed preview exposed explicit-null energy values; normalization and regression coverage now preserve those unknowns. A regression test also verifies that quantity edits preserve stored timestamp instants while normalizing PostgreSQL offset strings to canonical UTC for validation. Final configured suites have no failures or skipped cases.

Acceptance met: an authenticated user searches Norwegian foods, logs grams/servings, saves reusable recipes, edits/deletes intake and returns in a new browser to the correct daily history and goals. Private foods cannot leak through recipes or references. See `NUTRITION.md` for exact arithmetic and operational limitations.

Phase 4 delivers the health diary and real calendar described below.

## Phase 4 — Health and calendar

- [x] Persistent manual steps/water/sleep/heart-rate/weight/body measurements, sleep intervals/quality, notes, revisions, dated goals, source/import fields, 7/30/90-day charts and missing-data semantics.
- [x] Private month/week/day calendar with navigation, real daily records, independent routine/recipe snapshots, weekday recurrence preview, bounded atomic materialization, single/future edits, cancellation and series retirement. DST gaps reject saves; overlaps use standard time.
- [x] Atomic scheduled workout start/resume through the existing logger and actual meal consumption with adjustable servings; unique fulfillment, historical basis retention and reopen-on-delete. Live dashboard, upcoming plans, health/nutrition targets and seven-day summaries; configurable diary timezone in Settings.

Acceptance met against hosted Supabase: plans remain separate from actuals, snapshots and unique fulfillment are enforced in SQL, and fresh-browser desktop/mobile workflows pass. Recurrence is finite (one year / 366 occurrences), with explicit saved occurrence overrides; no unlimited/background scheduling.

## Deferred community scope — Community programs

- [ ] Opt-in public profiles, content review, publishing validation, semantic snapshot schema, version creation, discovery/favorites.
- [ ] Withdrawal, moderation, account-erasure and published-content retention lifecycle before public launch.
- [ ] Atomic independent copies into user-owned exercises/foods/routines/recipes and personal schedules with creator/version attribution.

Acceptance: only intentionally public versions are discoverable; historical versions cannot mutate; recipient copies survive creator edits; private diaries stay inaccessible; deletion/withdrawal has a tested, explicit lifecycle.

## Phase 6 — Imports and advanced tracking

- [x] Matvaretabellen cache, source provenance and explicit repeatable import delivered in Phase 3.
- [ ] Scheduled source refresh and food-label scanning; scans must require user verification.
- [ ] Garmin/provider OAuth, token vault, signed webhooks, queue retries and idempotent normalized imports.
- [ ] Define cross-source overlap/priority behavior before summing wearable/manual health observations.
- [ ] Cardio duration/distance UI; privacy export/deletion, accessibility review, deployment observability and operational backups.

Acceptance: retries do not duplicate records; multiple providers do not double-count daily totals; revocation works; tokens never enter client-readable storage; scan suggestions are never silently treated as verified facts.

## Remaining limits and blockers

The private strength module is connected to the configured hosted Supabase project and verified with real persistence. All verification fixtures were removed; no existing personal records were overwritten. No application deployment was performed. Nutrition imports are explicit maintenance commands; full catalog/history loading should become server search/date-bounded aggregation for large accounts. Cooking-yield inference, nested recipes, offline nutrition sync and custom micronutrient editing remain out of scope. Nutrition, health, calendar and dashboard use private live records. Community remains explicitly demo/deferred. Fictional dashboard/calendar previews live only under /demo. Device recovery is not full offline synchronization. Password recovery/resend, supersets, timers, additional PR categories, query optimization, and published-content erasure remain follow-up work.

`npm audit --omit=dev` reports zero vulnerabilities. The full audit reports five high-severity findings in the development ESLint dependency chain, originating in `braces`; no patched compatible upstream release is available in the registry at verification time. Track the upstream fix without downgrading the framework lint configuration.

## Phase 4 delivery and verification

Forward migrations 008/009 applied safely to the configured hosted project without resets or personal-record rewrites. RLS remains enabled on all 27 tables with 35 policies. Fifteen authenticated-only invoker RPCs now include health goals, schedules, atomic workout start and meal fulfillment. Migration 009 enforces planned recipe links and supplies an action-clock start instant to avoid a one-second hosted database clock lead during immediate completion.

Implemented behavior and limits are documented in [HEALTH-CALENDAR.md](HEALTH-CALENDAR.md). Recurring edits modify a bounded saved occurrence set, preserve individual exceptions/completed records, and keep original occurrence keys. Cancelled entries remain historical rows. The manual metric dictionary is extensible; custom measurement labels use cm. Wearable source-overlap handling, Garmin, scanning and community copying remain future work. Dashboard/calendar skip loading the food catalog; complete personal histories remain paginated pending date-bounded SQL aggregation.

Final regression gate passed: lint, strict TypeScript, Prettier check and production build; 52 domain/PGlite tests, 25 isolated native PostgreSQL tests, 16 UI tests, three real hosted API scenarios and all 24 desktop/mobile Chromium cases. No configured cases failed or skipped. The browser gate covers health creation/corrections/deletion, goals, recurrence preview, single-occurrence edits, prescribed sets, scheduled workout completion, actual recipe portions, fresh-browser persistence, date/view navigation and overflow checks. Prior selector/global-signout test cleanup issues and a real remote-clock skew defect were corrected. Real hosted latency exceeded the original five-second assertions on mobile, so browser expectations now allow 15 seconds while continuing to require confirmed persistence. All disposable verification accounts were removed.

Current Phase 5 scope is production deployment and assignment acceptance, as explicitly requested. Community publishing, scanning and wearable synchronization remain deferred.

## Phase 5 - Deployment and assignment acceptance

Deployed on October 16, 2026 after explicit approval of private GitHub publication, production deployment and necessary fixes. Source: https://github.com/BuzzDot/DAVE3625-MA3 (private). Vercel: DAVE3625/form-dave3625-ma3 (Node 24, Next.js, Frankfurt), https://form-dave3625-ma3.vercel.app, READY release `e0441a1`. The first cloud build exposed an unanchored migration-directory ignore matching application modules; `/supabase/` corrected packaging and the cloud build passed.

Prepared .vercelignore, manual-deployment configuration, security headers, source/privacy scanning, independent external-HTTPS acceptance tooling, an untouched-account browser workflow and docs/SUBMISSION.md. Only the public Supabase URL/key and production site origin are configured on Vercel; no admin credentials are part of the application. Local environment values remain intact. Existing hosted migrations 001-009, RLS on 27 tables, 35 policies and 15 authenticated-only invoker RPCs were audited successfully. Supabase signup/email confirmation remain enabled; the minimal production redirect patch is applied and retains localhost callbacks.

Final local checks passed lint/TypeScript/format/build, 55 domain/PGlite tests, 16 UI tests and 25 native PostgreSQL tests. Independent production acceptance passed all three hosted API scenarios and all 28 desktop/mobile browser cases with no local server and no skips. A separate production auth regression passed as described below. All disposable fixtures were removed. The tracked source scan found no findings; ten live login-page JavaScript assets contained no checked non-public local environment value. Vercel inspection reports READY; the inspected log window contained no runtime errors or HTTP 5xx records. See DEPLOYMENT.md for exact scope/results.

Auth corrections: signup now confirms email independently of browser PKCE cookies and requires subsequent password login. Implicit tokens are discarded rather than persisted. Legacy PKCE callbacks remain supported. Password validation distinguishes signup from older account login, uses a 72-byte signup ceiling and gives safe error-code messages; resend confirmation is available. Local and production real-Auth/browser verification passed strong symbols, UTF-8 limits, unconfirmed denial, confirmation in a fresh context, fragment removal, login/reload/logout and replay/redirect protection. These used generated links, not inbox delivery. The free default email provider refuses template edits and restricts recipients; custom SMTP is required for arbitrary new-user email delivery. Real production inbox confirmation remains outstanding: the approved inbox already has an unconfirmed account and deployed resend was rate-limited. Its existing account/password were left unchanged. Next action is inbox confirmation after the provider limit resets (or custom SMTP), followed by the user's normal password login. Do not describe this remaining gate as passed.

Demonstration decision: use existing authorized accounts; the user declined SMTP setup for this demonstration. Read-only follow-up confirmed the configured project-wide limit of two emails per hour and that the approved account is still unconfirmed. No further email was sent during inspection. Normal inbox confirmation remains the only account-access gate; no confirmation bypass or rate-limit change was made. Custom SMTP is optional future work if arbitrary assessor registration is needed.
