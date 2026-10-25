# Browser testing evidence — October 25, 2026

The original final-QA run used **real headless Chromium through Playwright**, not a human-operated browser. Calling it manual testing would be inaccurate. Unit/component tests were separate. Mobile means Chromium with iPhone 13 emulation, not a physical iPhone or Safari.

## Original localhost run

The 34 reported browser cases ran against `http://127.0.0.1:3100`, serving the local Next.js production build and connecting to the real hosted Supabase project with disposable confirmed accounts. No Vercel page was visited during that QA turn. `http://127.0.0.1:3000/login` was subsequently checked with an HTTP fetch after starting the review server; that was not another browser test.

The following is a retrospective transcription of the prior successful console output, corroborated by the test definitions. It is not a retained raw Playwright JSON report from that run. Each Desktop/Mobile cell is a distinct execution: 17 scenarios × 2 projects = 34 cases.

| #   | Exact test title                                                                                    | Desktop | Mobile |
| --- | --------------------------------------------------------------------------------------------------- | ------- | ------ |
| 1   | all seven routes render without horizontal overflow or browser errors                               | Passed  | Passed |
| 2   | dashboard water demo is explicit and bounded                                                        | Passed  | Passed |
| 3   | demo workout records completed sets only and resets on reload                                       | Passed  | Passed |
| 4   | manual demo food updates displayed macro totals                                                     | Passed  | Passed |
| 5   | calendar changes dates and months and progress changes metrics                                      | Passed  | Passed |
| 6   | keyboard skip link reaches main content and unknown paths return 404                                | Passed  | Passed |
| 7   | private routes never expose a demo identity or live diary to an anonymous visitor                   | Passed  | Passed |
| 8   | auth forms reflect whether Supabase is configured                                                   | Passed  | Passed |
| 9   | real barcode lookup, reviewed personal food and confirmed quantity persist without changing history | Passed  | Passed |
| 10  | templates connect to scheduling, meal-specific logging and dashboard totals                         | Passed  | Passed |
| 11  | health, recurrence, scheduled workout and meal persist across fresh desktop/mobile sessions         | Passed  | Passed |
| 12  | a new account has real empty states, working pages and persisted timezone preferences               | Passed  | Passed |
| 13  | Norwegian food, custom food, saved recipes, dated goals and fresh-browser nutrition persistence     | Passed  | Passed |
| 14  | routine validation, interrupted save recovery, editing, duplication and archival                    | Passed  | Passed |
| 15  | real login, routine creation, saved sets, fresh-session history and logout                          | Passed  | Passed |
| 16  | shared strength logger controls work without overflow on the explicit nonpersistent preview         | Passed  | Passed |
| 17  | published responses resist framing, avoid caching private routes and expose no deployment files     | Passed  | Passed |

Definitions remain in `tests/e2e/`; `playwright.config.ts` establishes the original localhost target. The title “published responses” does not establish a Vercel target; the base URL determines that.

Local browser route coverage, with origin `http://127.0.0.1:3100`:

```text
/
/login
/signup
/setup
/workouts
/workouts?date=2027-06-14
/workouts?date=2027-06-15
/workouts/<generated-workout-UUID>
/workouts/11111111-1111-4111-8111-111111111111
/nutrition
/nutrition?date=2026-10-10
/nutrition?date=2026-10-11
/nutrition?date=2026-10-12
/nutrition?date=2026-10-13
/nutrition?date=2027-06-14
/nutrition?date=2027-06-15
/nutrition?date=2026-10-25&view=meals
/nutrition?date=invalid&view=invalid
/calendar
/calendar?date=2027-04-12
/calendar?date=2027-04-13
/calendar?date=2027-06-14&kind=workout&template=<generated-routine-UUID>#schedule
/calendar?date=2027-06-15&kind=workout&template=<generated-routine-UUID>#schedule
/calendar?date=2027-06-14&kind=meal&template=<generated-recipe-UUID>#schedule
/calendar?date=2027-06-15&kind=meal&template=<generated-recipe-UUID>#schedule
/calendar?date=invalid&kind=meal&template=invalid
/health
/progress
/settings
/community
/demo/dashboard
/demo/workouts
/demo/nutrition
/demo/calendar
/demo/progress
/demo/logger
/unknown-module
```

This list is reconstructed from test routes/link assertions, not a historical navigation log. Additional contextual links use selected dates and generated template IDs. The exact UUIDs and exhaustive historical URL sequence were not retained, so those cannot now be supplied honestly.

Only two screenshot files and `.last-run.json` survived the final targeted barcode rerun. Playwright had replaced the earlier full-suite `test-results` contents. They are copied to `playwright-report/local-2026-10-25/`: `desktop-barcode-review.png` and `mobile-barcode-review.png`. That `.last-run.json` describes the two-case rerun, not all 34 cases. Authenticated traces/video were disabled to avoid password/token artifacts. The overwritten full-suite screenshots cannot be recovered here.

## New public Vercel test requested in the follow-up

Browser target: **https://form-dave3625-ma3.vercel.app**. Initial run started at **17:55 Europe/Oslo**, with corrected navigation rerun at **17:58**. Playwright version **1.64.1**, real headless Chromium, desktop and mobile-emulation projects. The production runner starts **no localhost server and performs no build or deployment**. An unrelated local review server may still be running; it is not the browser target.

The deployed-interface workflow specs were copied from committed HEAD into ignored `playwright-report/production-smoke/specs/`; this avoids requiring locally added UI that has not been deployed. Added instrumentation records navigation/diagnostics and explicit screenshots. No application source was changed for these checks.

Run commands:

```powershell
$env:FORM_TEST_BASE_URL = 'https://form-dave3625-ma3.vercel.app'
npm run test:production -- --config playwright-report/production-smoke/playwright.config.ts
$env:FORM_BROWSER_ARTIFACT_DIR = 'playwright-report/production-smoke/navigation-rerun'
npm run test:production -- --config playwright-report/production-smoke/navigation.config.ts
```

Results: **25 passed / 1 failed / 0 skipped initially**. The added desktop navigation test mistakenly requested the exact accessible name `Community`, while the desktop link is `Community SOON`. Its corrected selector passed the targeted desktop rerun: **1 passed / 0 failed / 0 skipped**. Both raw reports are retained. There are **26 distinct browser cases with passing final results across the two runs**, not a single clean 26-case run. The initial failed test is not suppressed. The deployed application was not changed to resolve it.

Both production invocations also passed all **three real Supabase API scenarios**. All six disposable admin-confirmed accounts created across the two runs were removed; personal accounts/records were preserved. Fixture provisioning is not an email-delivery test.

| Production workflow                                                                                                                                    | Desktop                   | Mobile           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ---------------- |
| Public/demo navigation, interactions, keyboard/404, anonymous protection, signup form, security responses (9 scenarios per project)                    | Passed                    | Passed           |
| Workout routine creation → completed set/session → reload/fresh browser → progress → correction/session refresh → owner isolation → deletion/logout    | Passed                    | Passed           |
| Norwegian food search → food/recipe creation → portion logging → corrections/goals/history → calendar summary → new-browser persistence/archive/delete | Passed                    | Passed           |
| Health entry/correction/goal → recurring plan → scheduled workout completion → consumed meal → fresh-browser retrieval/chart/date controls → dashboard | Passed                    | Passed           |
| Click navigation through Dashboard, Workouts, Nutrition, Calendar, Health, Progress, Community and Settings; logout/anonymous denial                   | Passed on corrected rerun | Passed initially |

These interactions exercise the public Vercel application and its real Supabase-backed authentication and persistence, rather than only direct API tests. The fixture setup/API checks use the configured linked hosted project; browser saves and new-session retrieval demonstrate the deployed app's connection to it.

## Exact observed production URLs and artifacts

The complete observed main-frame URL list, including real generated workout IDs, is in `playwright-report/production-smoke/visited-urls.json`. It covers `/`, `/login`, `/signup`, `/setup`, `/workouts`, `/nutrition`, `/calendar`, `/health`, `/progress`, `/settings`, `/community`, the five `/demo/*` routes, `/unknown-module`, nutrition dates October 12/13 and calendar dates April 12/13, 2027, plus nested workout URLs.

Instrumentation covers the primary test contexts; additional browser contexts used by persistence tests were not attached to this observer. Their workflow assertions still ran, but this URL log is not claimed to be a complete network trace of every context. Sensitive query parameters, cookies, request bodies and tokens were not recorded.

Retained production artifacts under `playwright-report/production-smoke/`:

- `run.log`, `results.json`: original 26-case console/JSON output, including the selector failure.
- `navigation-rerun.log`, `results-navigation.json`: corrected desktop navigation output.
- `summary.json`: test outcomes, timestamps, screenshots and diagnostic summary across both runs.
- `visited-urls.json`, `evidence/*.json`, `navigation-rerun/evidence/*.json`: exact observed URLs and timestamped per-test events.
- `screenshots/`: 21 initial screenshots, including completed workouts, recorded nutrition, persisted calendar health/meal data, and private navigation on both layouts.
- `navigation-rerun/screenshots/`: seven corrected desktop navigation screenshots. There are **28 explicit production screenshots** total.

Recorded primary-context diagnostics: **zero page exceptions**, **zero non-aborted failed requests**. Two console errors and two HTTP 404s came from deliberately visiting `/unknown-module`, once per layout. There were 139 `net::ERR_ABORTED` events during navigation/prefetch cancellation; these are retained and not described as zero network failures. This instrumentation does not expose Vercel server logs or Supabase server-side request internals.

## Still unverified

No real inbox confirmation, password recovery, physical-device camera decoding, Safari/Firefox, Garmin, production barcode feature, or production deployment of the local changes was verified. Production smoke checks do not establish exhaustive correctness of every feature. Nothing was committed, pushed or deployed.
