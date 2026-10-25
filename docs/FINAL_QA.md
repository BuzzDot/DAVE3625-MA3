# Final QA and release preparation

Date: October 25, 2026. Scope: current local working tree, including pre-existing uncommitted diary improvements. Nothing was committed, pushed or deployed. The existing Vercel release was not changed or re-certified. The original assignment brief is unavailable; the documented acceptance criteria and supplied final-QA request are the baseline.

## Feature status

| Feature                                              | Classification        | Evidence / limit                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation, private routes, desktop/mobile layouts   | **Working**           | Actual Chromium navigation, date controls, nested workout routes/reloads, empty states, keyboard skip link, 404 and overflow assertions.                                                                                                                        |
| Login, session persistence, logout, user isolation   | **Working**           | Real hosted Auth/API, fresh browser sessions, protected anonymous routes, SQL/API/browser ownership checks.                                                                                                                                                     |
| Public signup and real confirmation-email delivery   | **Not tested**        | Forms/validation are tested; no real inbox was used in this run. Previously documented provider recipient/rate limits still require a manual check.                                                                                                             |
| Routines, set logging, history and strength Progress | **Working**           | UI create/edit/duplicate/archive, complete/save/reload, fresh-session history/PRs, interrupted-save recovery.                                                                                                                                                   |
| Food library, intake, recipes/saved meals and goals  | **Working**           | UI and real API create/edit/archive/log/correct/delete, dated targets, source search, fractional servings, historical snapshots and new-session retrieval.                                                                                                      |
| Health diary, dashboard and nutrition/health trends  | **Working**           | Real observations/targets/timezone persistence, calendar/dashboard totals and chart/date controls. Missing data remains unlogged/unknown.                                                                                                                       |
| Calendar, recurrence and plan fulfillment            | **Working**           | UI preview/save/reload, template shortcuts, recurrence/DST SQL checks, edits/cancellation, scheduled workout/meal fulfillment and persistence.                                                                                                                  |
| Typed barcode lookup and confirmed intake            | **Working**           | Real Open Food Facts v3 lookup on desktop/mobile; review/correct draft → save personal food → confirm 25 g → SQL snapshot → new-session retrieval. Another user cannot read it; catalog edits preserve prior calories.                                          |
| Camera barcode scanning                              | **Partially working** | Native scanner implemented. Simulated detector success, denied permission, unsupported browser and late-stream cleanup pass automated tests. Unsupported-browser fallback also passes browser interaction. Physical camera/hardware decoding is **not tested**. |
| Garmin export import / automatic sync                | **Not implemented**   | Optional stretch goal skipped: no representative daily-steps export was available to validate fields, dates, timezone and duplicate/conflict behavior.                                                                                                          |
| Community publishing, OCR, meal-photo estimates      | **Not implemented**   | Community remains explicitly labeled demo content.                                                                                                                                                                                                              |
| Local optimized production build                     | **Working**           | Next.js production build and production-server browser suite passed.                                                                                                                                                                                            |
| Deployment of these additions                        | **Not tested**        | Intentionally not deployed; commit, push and deployment require approval.                                                                                                                                                                                       |

## Checks completed

- `npm run lint`, `npm run typecheck`, `npm run format:check`: passed.
- `npm test`: **61 passed**, including 25 actual migrated PGlite SQL/security cases and barcode normalization/provider-failure checks.
- `npm run test:ui`: **35 passed**, including camera lifecycle/fallback simulation and reviewed-draft behavior. These mocked-transport cases are automated-only evidence.
- `npm run test:postgres`: **25 passed** in an isolated native PostgreSQL 17 cluster, including two-user authorization and reconnect persistence.
- `npm run test:hosted`: **3 real Supabase API scenarios + 34 desktop/mobile Chromium cases passed, no skips**. The runner builds Next.js before starting the local production server and executes the same Playwright suite as `test:e2e`. It uses hosted Supabase with disposable dedicated confirmed accounts, then removes only its own fixtures. Admin-confirmed fixtures do not establish email delivery. No personal records were reset.
- Production build: passed repeatedly through `test:hosted`; tested server origin `http://127.0.0.1:3100`. No build replaced `.next` while a browser verification server used it.
- `npm audit` and `npm audit --omit=dev`: **zero vulnerabilities** with the current lockfile. No dependency changes were needed.
- `npm run audit:source`: passed for tracked and non-ignored untracked candidates; no credential/private-artifact findings. Pattern scanning supplements review.
- Security response/browser checks: framing/MIME/indexing restrictions, private no-store responses, anonymous denial, hidden environment/config/tooling files. The new camera policy allows only the same origin; microphone/geolocation remain denied.

Browser evidence comes from real clicks, form input, saves, reloads and observable persisted results. Desktop/mobile fixtures were captured after login without password-bearing traces; barcode screens have no horizontal overflow. Camera hardware, Safari/Firefox and actual production behavior of the new code remain unverified. Browser console/request/page-error monitoring in the barcode and recovery journeys found no unexpected errors; failure-recovery scenarios deliberately abort requests.

## Fixes and implementation

- Fixed a timezone-dependent test assertion: native PostgreSQL returned correct timestamps in local-offset text, while the recurrence test matched UTC clock text. It now compares absolute ISO instants. The application recurrence logic and deployed SQL were unchanged.
- Added authenticated Open Food Facts v3 lookup, typed-code fallback, optional local camera detection, attributed product/macronutrient preview and the existing editable personal-food/quantity-confirmed logging flow. No dependencies or migrations were added.
- Preserve null/zero distinctions and explicit gram servings; reject liquid/unclear mass bases and malformed codes. Provider failures/missing products give manual-entry guidance. Fixed the new browser test's description and diary selectors after inspecting actual rendered controls; those initial test failures were not application persistence defects.
- Added [USER_GUIDE.md](USER_GUIDE.md); updated README, architecture, plan, nutrition and setup documentation. Existing user changes were preserved.

## Accepted limits and next priorities

Barcode results are reviewed personal copies, not trusted shared imports. Provider, code, source URL and retrieval time live in editable food descriptions; structured immutable scan evidence, automatic deduplication and provider refresh are deferred. Reuse saved foods rather than saving another copy on every scan. Labels with an unclear mass basis need manually verified per-100-g values; no ml-to-g conversion is invented. Unknown individual nutrients propagate through totals. Open Food Facts is community data and may be stale/incomplete; the package remains the review source. Lookups have an eight-second timeout, 24-hour product cache revalidation, fixed origin and no automatic retries. Shared-host provider rate limits remain an external service constraint.

Garmin support should begin only with a real supported export and verified daily-total/date/timezone semantics, followed by preview, explicit conflict handling and atomic owner-isolated import. No Garmin login, credentials, external approval or speculative parser was attempted. Relevant references: [Garmin export guidance](https://support.garmin.com/en-US/?faq=W1TvTPW8JZ6LfJSfK512Q8), [official FIT SDK](https://developer.garmin.com/fit/overview/).

Existing MVP debt remains: complete personal history/catalog loading, finite recurrence, unsaved routine forms that do not survive navigation, no password recovery/account export/deletion, and incomplete community publishing. These were not expanded during final QA. Barcode API/basis references: [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/), [data licensing](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/), [native detector support](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API).

## Before submission

1. Use an existing confirmed account for a reliable demonstration. If demonstrating registration, retest the newest real confirmation email in an authorized inbox; default provider limits still apply.
2. If presenting camera scanning, test an actual supported phone over HTTPS, including permission denial and manual fallback. Otherwise demonstrate typed barcode entry.
3. Review/approve the local changes before any commit, push or deployment. The current Vercel site does not contain these additions. After an approved deployment, rerun external production acceptance and the phone check.
4. Retain Node 24 and the three documented public variables. Barcode lookup adds no secret/API key or migration. Production Supabase Auth origins/redirect allowlists must match the deployed origin. Vercel's normal Next.js server build is configured; a fresh cloud/Linux build of these changes has not been performed.

No GitHub submission work, assignment reflection or demonstration video was prepared.

## Follow-up: public browser evidence

The original report above concerns localhost with hosted Supabase, not Vercel. The requested follow-up subsequently tested `https://form-dave3625-ma3.vercel.app` directly using real Playwright Chromium: 25 of 26 cases passed initially, with one new desktop navigation selector failure (`Community` versus `Community SOON`). The corrected desktop case passed its targeted rerun. All 26 distinct cases therefore have passing final results across two runs; both raw reports are retained. Core workout/nutrition/calendar/health persistence passed on both layouts, along with real authentication, dashboard/navigation and three API scenarios per invocation. No local changes were deployed. See [BROWSER_EVIDENCE.md](BROWSER_EVIDENCE.md) for the exact original 34 cases, retained-artifact limits, production results, URL records and screenshots.
