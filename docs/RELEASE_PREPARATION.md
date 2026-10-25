# Release candidate — publication approval pending

Prepared October 25, 2026. This is the local release candidate, not a newly deployed release. Stop before commit, push or deployment until the user explicitly approves those actions.

## Source and deployment targets

- Repository: https://github.com/BuzzDot/DAVE3625-MA3, branch `main`.
- Local HEAD and remote `main`: `f7109985dbc4b0be9bca7fd42ec6d496e3be1434`. They match; the release changes are uncommitted. **No release commit hash exists yet.**
- Production origin: https://form-dave3625-ma3.vercel.app.
- Existing production deployment: `dpl_GkL3qZJ7PEVcgiPGvaEhLGn2UhgM`, observed **READY**, source commit `3cc9c2503ed10430c2856e2ac3e64fc12eb1b3e5`, ref `main`. This is the older release.
- Vercel project: `DAVE3625 / form-dave3625-ma3` (`prj_r7AQedr8LcRPhXeBVhvr82FHwN9C`), repository root, Next.js, Node `24.x`, `npm ci`, `npm run build`.
- The Vercel project has no Git integration link; `vercel.json` also disables automatic Git deployments. A push does not deploy. After approval, an explicit production deployment is required.

Read-only Vercel inspection confirmed exactly the three expected production environment keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`. Values were not decrypted or changed. The Vercel connector returned a team-scope 403; the existing authorized CLI successfully inspected the same explicit project/team. No connector authorization or account setting was changed. Prior public-browser authentication/persistence checks demonstrate the existing production Supabase connection; new-release acceptance remains pending deployment.

## Reviewed release scope

Include the application, tests and documentation changes already present: calendar template terminology/empty-state guidance; contextual routine/recipe scheduling; meal-category shortcuts; shared real-data nutrition totals; mobile health-card layout; interrupted routine/schedule-save handling; barcode lookup/camera fallback and its tests; test infrastructure/date-fixture fixes; README/user/technical/evidence documentation; and engineering instructions reflecting the authorized barcode scope.

The barcode flow reuses verified authentication, personal-food validation/RLS and existing quantity-confirmed invoker SQL. It never writes shared catalog provenance or browser-supplied intake totals. Review/save a personal food first, then confirm consumed grams or an explicit gram serving in the existing logger. No dependency, migration, hosted database/schema/configuration change or Garmin implementation is included.

Release review found and fixed a real barcode issue: Open Food Facts normalizes leading zeroes, so the exact string comparison rejected a valid 14-digit code when the provider returned its 13-digit equivalent. Lookup now compares equivalent GTIN identities, retains the scanned code in the draft, links to the provider's canonical code, and still rejects unrelated products. The real browser workflow now uses `03017620422003` and confirms provider code `3017620422003`. Unit regressions also cover UPC-A/EAN and short-code padding. Reference: [Open Food Facts barcode normalization](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-barcode-normalization/).

## Packaging and data safety

- Leave `.agents/` and `skills-lock.json` on the user's machine; exclude them from the release commit. `.vercelignore` excludes `.agents` and now explicitly excludes `/skills-lock.json` from CLI upload.
- Environment/credential files, `.vercel` state, `.next`, `node_modules`, reports, screenshots, logs, coverage and Supabase temporary state remain outside Git. `.vercelignore` additionally excludes tests, documentation, administrative scripts and migrations from application uploads.
- Keep meaningful test sources in Git. They use synthetic fixtures/identifiers, not persisted account data or credentials. Actual reports, fixture screenshots and credential-bearing traces are not release files. All disposable accounts from this preparation's verification runs were removed; real user data was not reset.
- The exact intended changed-file list and SHA-256 file hashes are stored locally in ignored `playwright-report/release-preparation/release-manifest.json`, with an accompanying NUL-delimited path list. Review/use that explicit list after approval; do not use an indiscriminate `git add .`. No files are staged by preparation.

## Verification of the release candidate

- `npm run lint` and `npm run typecheck`: passed after the final code/test corrections.
- `npm test`: **62 passed**. `npm run test:ui`: **35 passed**. These include actual migrated PGlite ownership/snapshot invariants, normalization/null/basis tests and mocked camera lifecycle/error tests.
- Optimized production build: passed through `npm run test:hosted` before each browser server started. The earlier local review server was stopped first. No running server's `.next` output was replaced.
- Focused localhost Chromium verification against hosted Supabase: **six existing cases passed** across desktop/mobile (real normalized barcode lookup → reviewed personal food → confirmed quantity → snapshot/history/persistence/isolation; connected scheduling/meal/dashboard workflows; routine failure recovery). No entire repeat of the earlier 34-case suite was needed.
- Added **two simulated-camera browser cases**, one per layout. Initial fake-media setup failed because this Chromium build also requires the fake-permission flag; isolated diagnosis identified that requirement. Both corrected cases passed their targeted rerun. These use actual browser video/MediaStream from Chromium's synthetic camera with simulated detector output, verify stop/decode track release, perform a real product lookup, and simulate permission denial while retaining manual entry. **They do not verify physical hardware or a real optical barcode decode.** The initial failed report and passing recheck log are kept locally.
- Each focused runner also passed **three real Supabase API scenarios**. Three disposable accounts were cleaned up per invocation. API fixtures are administratively confirmed and do not test email delivery.
- `npm run audit:source`: passed with no flagged credentials/private artifacts. `npm audit`: **zero vulnerabilities** with the existing lockfile. No package change was necessary.
- Native PostgreSQL's **25 passing cases** from the earlier QA remain applicable; no schema/migration changed in this preparation. The earlier **34 local browser cases** and **26 distinct older-release production cases** remain separately documented in [BROWSER_EVIDENCE.md](BROWSER_EVIDENCE.md).

The focused browser commands/logs are under ignored `playwright-report/release-preparation/`: `focused-browser.log` (six pass, two initial fake-camera setup failures) and `camera-recheck.log` (both corrected camera cases passed). This is eight distinct focused browser cases with passing final results across two runs, not one clean eight-case run. This preparation's desktop/mobile simulated-camera screenshots are retained there; the earlier barcode draft screenshots remain in `playwright-report/local-2026-10-25/`. The targeted rerun replaced the first preparation run's screenshot folder, so the older draft screenshots are not claimed as new normalization screenshots. Screenshot assertions also check no horizontal page overflow.

## Remaining limits and blockers

There is no remaining known local code/build blocker from this review. **Publication approval is the required next gate.** New cloud/Linux build success and new-version production acceptance cannot be established before the approved deployment.

Physical-camera decoding, Safari/Firefox and real confirmation-email delivery remain unverified. Manual barcode entry works without camera support. For a reliable demonstration, use a confirmed account; demonstrate new registration only after testing an authorized inbox. Default email-provider recipient/rate limits still apply. No new external account is needed for barcode lookup.

Barcode products must have a confirmed mass basis; liquid/unclear labels require verified manual per-100-g entry. Unknown nutrients stay null. Reviewed copies retain editable source descriptions but have no automatic deduplication/provider refresh or structured immutable scan-evidence record. Full account history/catalog loading and finite recurrence remain accepted MVP limits. Community is a demo; password recovery/account export/deletion and OCR are not implemented.

Garmin is skipped as the optional stretch goal: no working importer or representative export exists. It remains a future enhancement, with no unofficial authentication, new dependency or synchronization service added.

## Actions only after explicit approval

1. Recheck the reviewed file hashes and branch; stage only intended release paths, review the staged diff, create the clean release commit and record its hash.
2. Push `main` to the existing GitHub repository.
3. Explicitly deploy the linked Vercel project to production (normal cloud build, not a Windows prebuilt upload). Verify READY state, production alias and the new commit metadata before calling it the new live version.
4. Run focused **real-browser** smoke checks against the public HTTPS origin using disposable accounts: homepage/navigation, signup form/login/logout, saved workouts, nutrition, barcode normalization/review/quantity logging, calendar/dashboard, refresh/fresh-session persistence, desktop/mobile layout and console/network diagnostics. Retain results and remove only the created fixtures. Do not claim inbox delivery, physical camera or Safari based on these tests.
5. Update the release status, actual commit/deployment identifiers and verified scope. If deployment or production checks fail, report/fix the concrete issue within the approved release scope; do not describe the older deployment as the new version.
