# Form — university assignment prototype

## Purpose

Form is a private fitness diary for recording strength training, nutrition and daily health, and planning reusable workouts and meals in one calendar. It is a university prototype, not a medical assessment or wearable integration service.

## Submission links and release status

- Source repository: [BuzzDot/DAVE3625-MA3](https://github.com/BuzzDot/DAVE3625-MA3), **private**, created and pushed with explicit approval. Invite the assessor if private access is required.
- Vercel project: `DAVE3625 / form-dave3625-ma3`, Node.js 24, Next.js.
- Live application: [Form on Vercel](https://form-dave3625-ma3.vercel.app).
- Deployment status: **READY**, corrected release `3cc9c25`, deployment `dpl_GkL3qZJ7PEVcgiPGvaEhLGn2UhgM`. Deployed API/browser acceptance and desktop/mobile confirmation regression passed. Real production inbox confirmation requires a fresh manual retest after the callback correction; email quotas still apply.
- Database: existing hosted Supabase project, migrations 001–009 preserved. No database reset is part of deployment.

The public HTTPS application was independently tested without a local app server. It is ready to demonstrate with a confirmed account. Before demonstrating new-account registration, complete real inbox confirmation after the provider rate limit resets; configure custom SMTP for arbitrary assessor inboxes. Private repository access must be granted to the assessor separately if required.

The user selected existing authorized accounts for the demonstration, so custom SMTP and arbitrary assessor registration are outside the chosen demonstration setup. The existing approved account still needs normal inbox confirmation; a follow-up check confirmed the built-in provider's project-wide limit is two emails per hour. No email-security or rate-limit setting was relaxed, and no existing account was administratively confirmed.

The confirmation correction passed 56 domain/PGlite tests, 23 UI tests, lint/typecheck/format/build, three independent hosted API scenarios and all 28 production browser cases. Dedicated generated-link regression also passed on desktop/mobile against the deployed release, including server-verified confirmation, rejected links, fresh-browser login and persistence. This supersedes the earlier callback implementation described in the original acceptance results; actual inbox confirmation remains a separate user-operated check, with exact steps in SETUP.md.

## Implemented features

- Email/password signup with email confirmation, login, cookie/session refresh, current-device logout, protected diary routes and private per-user access.
- Strength routines and custom exercises, actual set logging with autosave/device recovery, historical sessions, workload/PR calculations and charts. Templates do not rewrite completed sets.
- Norwegian Matvaretabellen search using the persisted official food cache, personal foods, reusable recipes, fractional quantities/servings, dated calorie/macro goals and historical nutrition snapshots. Missing nutrients remain unknown.
- Manual steps, water, sleep intervals/duration/quality, weight, heart rate, body measurements and notes; corrections/deletion, dated targets, 7/30/90-day charts and configurable diary timezone.
- Month/week/day calendar; saved routines/recipes, weekday recurrence with preview, individual/future edits, cancellations and links to actual completed workouts/consumption. Plans do not count as actuals.
- Dashboard with real nutrition and health summaries, upcoming activities, recent workouts and selected trends. New users see empty states.

Community is explicitly deferred. `/demo/*` pages contain labeled, temporary fictional data. No food scanning, Garmin sync or public community publishing is implemented.

## Use of generative AI

OpenAI Codex was used as an implementation assistant throughout the work: translating requirements into domain boundaries, proposing UI/code and SQL migrations, creating verification tools/tests, diagnosing failures and drafting documentation. The conversational record contains the iterative requests and corrections. No separate AI-generated evidence is treated as a test result.

Generated changes were checked with TypeScript, lint, formatting, executable SQL/RLS tests, browser tests and hosted Supabase API checks. Test failures led to code and workflow corrections. The student remains responsible for understanding the implementation, checking this account of AI use against the course's disclosure requirements, and demonstrating the result. No specific student review or learning outcome is claimed here.

## Development and verification method

The project developed in increments: foundation, authenticated strength diary, nutrition, health/calendar, and deployment preparation. Architecture/plan documents track implemented work and deferred boundaries. Real production data access is separate from fixtures. SQL migrations move forward; ownership-safe references, explicit grants, RLS and invoker-security functions protect private data.

Tests cover pure arithmetic/validation, actual migrated SQL with two identities, native PostgreSQL reconnects, client interactions and desktop/mobile browser workflows. Hosted testing uses disposable confirmed accounts and ordinary public-key RLS access. Admin access is used only by explicit verification tooling for fixture lifecycle and audits, never by the application. Actual email signup/confirmation is verified separately from admin-confirmed fixtures.

For deployment acceptance, `npm run test:production` requires an explicit external HTTPS origin and starts **no local web server**. It repeats the API and browser workflows against the deployed site, including an untouched account's empty states. Public signup additionally requires an approved unused inbox and real email confirmation. See [DEPLOYMENT.md](DEPLOYMENT.md) for the release/verification procedure.

## Improvements prompted by tests

- Hosted PostgREST retried serialization conflicts; forward migration 005 introduced a business-conflict error that returns promptly.
- Snapshot tests exposed legacy nutrition rows without a recalculation basis; migration 007 preserves their original totals and rejects invented conversions.
- A mobile hydration race led to disabling controlled inputs until their handlers are ready.
- Official food-feed validation found explicit-null energy values; normalization now preserves unknown values.
- Scheduled workout acceptance exposed a small remote database clock lead; migration 009 accepts a bounded action-clock start instant so immediate completion remains valid.
- Browser verification found a test cleanup using global logout; cleanup now ends only its own session.
- Local signup feedback exposed a mismatch between the advertised password length and Supabase's 72-byte ceiling. Validation now handles UTF-8 correctly and accepts strong symbols without changing the password.
- Confirmation depended on the signup browser's PKCE cookies. Signup now confirms email independently, discards implicit tokens and requires a normal password login; real-Auth regression tests verify a fresh browser and protected routes.
- The first Vercel build revealed that the migration ignore rule also matched application modules. Anchoring it to the root preserves application source in the deployment.
- A later real-email failure exposed incomplete provider-error handling. The confirmation landing page now verifies success with Supabase, distinguishes rejected links from browser-bound callback failures, and clears token-bearing URL fragments. Signup and resend share an explicit, allowlisted confirmation destination. Generated-link tests are still reported separately from real inbox testing.

## Demonstration checklist

1. Open the final HTTPS URL on desktop and mobile. Show the new-account empty states and private workspace label.
2. Register with a test inbox, confirm the real email and log in. Never present an admin-confirmed fixture as proof of email delivery.
3. Create a routine, log completed sets, finish, reload and inspect workout history, PRs and charts.
4. Search `Havregryn`, log a quantity, create a recipe and consume a fractional serving. Edit quantity and demonstrate preserved historical nutrition.
5. Log water, steps and sleep; set an effective-dated target and inspect 7/30/90-day health history.
6. Preview/save a weekday workout series. Move one occurrence, start it through the existing logger and review its completed record.
7. Plan a recipe and log actual consumption separately. Show that plans never add calories before consumption.
8. Inspect the dashboard and another calendar date. Reload and reopen in a fresh session to demonstrate persistence.
9. Edit/delete test records. Sign in as a second test identity to demonstrate that private records remain inaccessible.
10. Log out and revisit a protected route. Identify Community and `/demo/*` as deferred/demo content.

## Results and remaining limits

Final local checks passed lint, TypeScript, formatting, production build, 55 domain/PGlite tests, 25 native PostgreSQL tests and 16 UI tests. Independent production acceptance passed three hosted API scenarios and all 28 desktop/mobile browser cases with no skips, covering the implemented diaries, calendar/dashboard, empty states, record edits/deletion, persistence and access restrictions. Separate production auth regression passed strong passwords, unconfirmed denial, fresh-browser confirmation, fragment removal, login/reload/logout and replay/redirect safety using a generated link. Disposable fixtures were removed. This generated-link result is not evidence of actual inbox delivery: the approved inbox already has an unconfirmed account and the production resend was rate-limited. That account/password were preserved.

The release source/privacy scan found no findings; production dependencies have zero reported vulnerabilities. Hosted RLS/grant auditing passed with 27 tables, 35 policies and 15 authenticated-only invoker RPCs. Ten live login-page JavaScript assets contained none of the checked non-public local environment value. Browser cases verified security headers and denied environment/tooling files. The inspected Vercel log window had no runtime errors or HTTP 5xx records. See [DEPLOYMENT.md](DEPLOYMENT.md) for scope and reproduction commands.

Recurring schedules are bounded to one year/366 occurrences. Complete personal histories are paginated rather than fully aggregated in SQL at scale. Password recovery, full offline sync, account export/deletion, public-program lifecycle and external wearable source overlap remain deferred. Resend confirmation is implemented. The free default email service restricts recipients to authorized project-team addresses and imposes low rate limits; configure custom SMTP before demonstrating arbitrary assessor signup. Development lint dependencies have a known advisory; the production dependency audit is separate. Vercel/Supabase plan limits and external-service availability apply.
