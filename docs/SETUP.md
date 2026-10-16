# Authentication and database setup

The workout, nutrition, health and calendar diaries use Supabase. Native SQL test clusters do not substitute for real Supabase Auth. Without a configured URL/key, private pages show setup instructions, signup/login are disabled, and explicit demo pages remain available.

## Local Supabase (recommended verification environment)

1. Start Docker Desktop with its Linux engine. In this repository, run:

   ```powershell
   npm ci
   npx supabase start
   npx supabase migration up --local
   ```

   This applies pending migrations to the local stack. Do not reset an existing database. Migrations 001-009 include the strength/nutrition diaries, health observations/goals, trusted snapshots, calendar recurrence and atomic fulfillment. Common exercises and metric definitions are migration-owned; no accounts or personal diary records are seeded.

2. Copy `.env.example` to `.env.local` and fill in the local URL and public publishable key printed by the CLI. The local legacy **anon** key also works if that is what your CLI exposes. Do not use a secret or service-role key. Set:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your local publishable or anon key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. `supabase/config.toml` already enables email signup/confirmation, an eight-character minimum password, the localhost site origin, and `/auth/callback`. Restart the local stack if you change auth config. Start the app:

   ```powershell
   npm run dev
   ```

4. Visit `http://localhost:3000/signup`. Use an email address and a password with 8–128 characters. Open the local email testing inbox printed by the CLI (normally Mailpit at `http://localhost:54324`), open the confirmation in the same browser, and log in. PKCE confirmation depends on the initiating browser's verifier cookie. If you opened the confirmation elsewhere and verification succeeded, log in manually in your original browser.

5. In Workouts, create a routine, add an exercise and intended sets, save it, start a workout, mark a set complete, and finish. Reload the record and sign in in a new browser context. Confirm that its sets appear in Workout history and Progress. A second account must not see or edit it.

The app works at port 3000 by default. If you change the origin, update `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, and the exact callback redirect allowlist together. Changing public environment variables requires restarting development or rebuilding a production deployment.

## Existing hosted project

Use a dedicated development/staging project. Configure its URL and publishable key in the ignored `.env.local`, set the exact application site origin and callback URL in Supabase Auth settings, enable email confirmation, and configure email delivery. Do not put a database password, service-role key, or provider token in any `NEXT_PUBLIC_*` variable.

Authenticate the Supabase CLI through its normal login flow, link the intended project, inspect migration history, and preview pending changes:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
```

After reviewing the exact project and pending SQL, `npx supabase db push` applies pending migrations. Do not run resets or force-repair history against a shared/hosted project. If phase-1 SQL was applied manually without tracked migration history, reconcile the migration history deliberately before pushing; do not replay CREATE TABLE statements over existing tables. The configured hosted project has now been inspected and migrations 001-009 applied without resetting data.

## Run verification

Available without Supabase:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:ui
npm run test:postgres
npx playwright install chromium
npm run test:e2e
```

`npm test` runs PGlite SQL tests and pure domain tests. `test:ui` runs the actual editor and autosave hook with a mocked server-action transport; it is not persistence/auth integration. `test:postgres` requires PostgreSQL 17 `initdb`/`pg_ctl` on PATH (or set `PG_BIN` to the installation's `bin` directory). It starts a temporary loopback-only cluster with a generated SCRAM password, applies all migrations, runs the same SQL/RLS tests including a real reconnect, then stops/removes that cluster. It never reads or resets an existing database. `npm run db:types` repeats isolated migration validation and regenerates `src/lib/supabase/database.types.ts` from the actual schema.

`test:e2e` builds and starts a production app on port 3100, verifies anonymous/demo routes on desktop and mobile, and conditionally runs live workflows. Without credentials its eight authenticated strength/nutrition/health/calendar/empty-account cases are reported as skipped. It does not replace them with mocks.

To enable real Supabase API/auth/browser checks, create **two distinct, confirmed, dedicated test accounts** using the real signup flow. Put their credentials only in `.env.test.local` (ignored):

```dotenv
FORM_TEST_EMAIL=<first confirmed test account>
FORM_TEST_PASSWORD=<its password>
FORM_TEST_OTHER_EMAIL=<second confirmed test account>
FORM_TEST_OTHER_PASSWORD=<its password>
```

Then run:

```powershell
npm run test:supabase
npm run test:e2e
```

The API tests cover real strength and nutrition persistence/isolation. The strength API scenario performs real sign-in, custom exercise/favorite/routine/workout saves, a fresh authenticated client read, snapshot checks, and cross-user read/update/RPC attacks. It cleans up only its exact created records. The live browser cases perform login → routine creation → workout completion → reload → new authenticated browser context → history/progress → logout. They disable password-bearing traces, screenshots, and video. Test fixtures may remain in the dedicated account if a process is interrupted; never use a real personal account for these tests. The CLI's production server and test contexts are stopped/closed after the suite.

## Hosted verification completed

Phase 4 adds forward migrations 008/009 without resets. After applying them, log in and open Calendar. Create a saved routine/recipe in its existing diary, preview a weekday series, save it, start/finish a scheduled workout, and log an actual recipe portion. Select another date and return in a fresh browser. Health logs, dated targets, 7/30/90-day charts and the private dashboard use real records. Set your IANA diary timezone in Settings. See [HEALTH-CALENDAR.md](HEALTH-CALENDAR.md) for recurrence limits, DST rules, exceptions and deletion behavior.

The hosted gate now runs three API scenarios and 28 browser cases (including eight authenticated workflows across desktop/mobile). Assertions allow up to 15 seconds for real hosted requests; successful state still requires database confirmation. The runner accepts Playwright arguments, for example `npm run test:hosted -- --grep 'health, recurrence' --project mobile`, while still executing the API gate and cleaning up its marked fixtures. Do not run a reset against the hosted project.

Phase 3 additionally applies migrations 006/007 and imports 2,121 Norwegian foods. A fresh project must populate the trusted food cache with `npm run foods:preview` and `npm run foods:import` using its authorized linked CLI before the nutrition API/browser gate. These commands do not require an API key, touch personal foods, or update historical snapshots. See [NUTRITION.md](NUTRITION.md) for mappings, nullable values, serving rules, recipe snapshots and maintenance.

The configured project passed real signup and inbox confirmation, login/reload/logout, API persistence/snapshots/CRUD/two-user RLS, and desktop/mobile authenticated browser tests including genuine refresh-token renewal after local expiry metadata was forced. Fixtures were removed. Existing application data was not reset.

To repeat the automated gate with an authorized, linked Supabase CLI:

```powershell
npm run audit:hosted
npm run test:hosted
```

The audit uses certificate-verified TLS and inspects grants, RLS, RPC security and migration history. The test runner creates three disposable admin-confirmed fixtures, runs API tests, builds, and runs all browser tests; credentials stay in memory and output is redacted. It checks the linked project matches `.env.local` before privileged operations and deletes only fixture IDs created by that run. This requires an already authorized Supabase CLI session with project administration access. The application itself never receives admin credentials.

Public email signup is deliberately separate from admin-confirmed test fixtures. To repeat with an approved, unused inbox, start the app at `NEXT_PUBLIC_SITE_URL`, set `FORM_SIGNUP_EMAIL` in the current shell, and run `node scripts/verify-signup.mjs`. Open the actual email confirmation within ten minutes. That script removes only its newly created, marked temporary account; existing inbox accounts are left unchanged. Use normal `/signup` separately to create a permanent personal account.

## Vercel production deployment

Publication and necessary corrective deployments are approved. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for current release status, variables, exact production/local auth redirects and the independent test:production gate. The acceptance runner provisions a third untouched account for empty-state checks; manual credential-based runs can set FORM_TEST_EMPTY_EMAIL and FORM_TEST_EMPTY_PASSWORD. Without those variables the two empty-account browser cases are explicitly skipped.

Signup confirms email without requiring the initiating browser: the app discards confirmation URL fragments and asks for normal password login. Existing PKCE links still attempt their original code exchange; if their email was already confirmed, log in normally. Use the newest email or the login page's resend option. Signup accepts strong symbols and enforces at least eight characters with a 72-byte UTF-8 ceiling; passwords are never trimmed or truncated. Login permits older account minimum lengths. Keep NEXT_PUBLIC_SITE_URL=http://localhost:3000 locally and restart development after environment changes. An email pointing to localhost requires that machine's development server; use the production signup page for confirmation on another device.

The hosted project's free default email provider restricts recipients to authorized team addresses and has low rate limits. It also rejects custom email template changes without SMTP or an upgraded plan. Configure custom SMTP in the Supabase dashboard before promising arbitrary assessor registration; never commit SMTP credentials. Do not disable confirmation to work around delivery. `node scripts/verify-auth.mjs` tests real Auth with a generated single-use link and a disposable account against localhost; set FORM_AUTH_TEST_URL to the production origin for a deployed check. It verifies confirmation in a fresh browser, strong-password login, unconfirmed denial, fragment removal, replay safety and refresh/logout. It does not establish inbox delivery.
