# Deployment and acceptance

## Deployed target

- GitHub: [private repository BuzzDot/DAVE3625-MA3](https://github.com/BuzzDot/DAVE3625-MA3), created and pushed after explicit approval.
- Vercel: `DAVE3625 / form-dave3625-ma3`; live production origin https://form-dave3625-ma3.vercel.app.
- Framework/root: Next.js App Router at repository root; Node.js 24.x, `npm ci`, `npm run build`, Frankfurt (`fra1`). No static export.
- Supabase: the existing linked hosted project, with migrations 001–009 retained. No reset or new database is needed.
- Publication: explicitly approved, including necessary fixes and acceptance. Release `e0441a1` is READY in production, deployment `dpl_H8vcNvn2etcNyjQbuFANQ7W2z5AH`. The first cloud build failed because an unanchored `supabase` ignore also excluded app modules; `/supabase/` corrected the packaging and the cloud build passed.

`vercel.json` disables automatic Git deployments. A Git push therefore does not constitute approval to publish an application release. CLI production deployment is a separate explicit step. The private personal GitHub repository is compatible with the selected workflow; the source need not be public for a public HTTPS app.

## Configuration and privacy

Only these application variables are set on Vercel, scoped to **Production**:

| Variable                               | Purpose                                                   | Classification                                                  |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Existing Supabase API endpoint                            | Public configuration                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public-key access governed by authenticated RLS           | Public configuration; never use service-role/secret credentials |
| `NEXT_PUBLIC_SITE_URL`                 | Fixed production origin used by signup/callback redirects | Public configuration                                            |

These are intentionally public configuration values. Vercel's Config type is appropriate; no administrative credential is a `NEXT_PUBLIC_*` value. CLI/admin credentials stay in the operator's credential storage or short-lived verification process memory. They are not configured in the running app. Production does not need a database password, service-role key, Vercel token or Supabase management token.

`.gitignore` excludes `.env*` except the empty `.env.example`, `.vercel`, Supabase CLI temporary state, browser reports, logs and build outputs. `.vercelignore` additionally excludes local environment files, test/admin scripts, migrations, reports and documentation from CLI source uploads. Migrations and scripts remain in the private source repository. Never overwrite `.env.local` with production values: `vercel pull --environment production` writes the ignored `.vercel/.env.production.local`; development keeps `http://localhost:3000`.

`npm run audit:source` scans the exact tracked/non-ignored publication candidates for likely credentials, private artifacts and non-example email addresses, printing file names/types rather than matched values. It supplements manual review; it is not a guarantee that arbitrary confidential content can be identified automatically.

Private pages authenticate on the server, request-scoped cookie refresh is retained, and user-owned SQL access remains subject to RLS/composite ownership references. Responses disable framing, MIME sniffing and indexing; the small CSP sets only framing/base/object restrictions and is **not** claimed to be a complete script-policy defense. Personalized routes remain `private, no-store`.

## Approval and release procedure

Before publication, complete the checks below, review SUBMISSION/PLAN, and request approval for the exact source repository and Vercel production origin. Creating/pushing the repository or uploading/deploying source must wait for that approval.

After approval:

1. Create the private GitHub repository and push the audited local `main` commit. Use the GitHub no-reply commit email and retain repository privacy. Invite an assessor only when the user requests it.
2. Apply only Supabase Auth's `site_url` and `uri_allow_list` changes: set the production origin, add its exact `/auth/callback`, and retain exact localhost/loopback callbacks. Preserve all other auth settings, confirmation requirements, provider configuration and database data. `scripts/lib/supabase-management.mjs` can use the existing CLI authority in memory for that minimal patch; it is excluded from deployment.
3. Run `vercel deploy --prod --yes --scope dave-3625` from the linked root. The cloud builds for Vercel's Linux runtime. Do not upload a Windows prebuilt artifact as a substitute.
4. Inspect deployment status and final alias. Verify HTTPS, anonymous protection, no-store/security headers and that environment/admin/source files cannot be fetched.
5. Run independent acceptance against the public origin:

   ```powershell
   $env:FORM_TEST_BASE_URL = 'https://form-dave3625-ma3.vercel.app'
   npm run test:production
   ```

   This command refuses a missing/non-external/non-HTTPS target, starts no local app server, creates three disposable confirmed accounts, runs real Supabase API scenarios and the desktop/mobile browser suite, then removes only its own fixtures. It covers an untouched account, diary CRUD, templates/snapshots, PR/history, nutrition, health, recurrence, dashboard, reload/fresh sessions and cross-user restrictions. Admin-confirmed fixtures do not establish public email delivery.

6. Verify actual signup/email confirmation with an approved unused test inbox:

   ```powershell
   $env:FORM_SIGNUP_EMAIL = '<approved unused test inbox>'
   node scripts/verify-signup.mjs
   ```

   Keep `FORM_TEST_BASE_URL` set to the public origin. The operator opens the real email within ten minutes. Passwords/tokens stay out of logs and files; only the newly created, marked verification account is removed. Existing accounts are left untouched. New signup confirms email independently of initiating-browser cookies, discards implicit tokens, and requires password login. No administrator confirmation is used for this check. The default mailer restricts recipients to authorized team addresses; arbitrary inboxes require custom SMTP.

7. Inspect Vercel error logs without copying auth URLs, tokens or private records into documentation. Record observed errors and monitoring limits, update SUBMISSION/PLAN with the verified URL/commit/results, and commit the handoff. An ordinary documentation push does not auto-deploy because Git deployments are disabled.

If a production defect requires a corrective redeployment, keep the change within the approved deployment task, rerun relevant checks, deploy and repeat the failed acceptance. If approval was limited to one immutable artifact, obtain approval for the replacement. Do not reset hosted data to fix a deployment.

## Acceptance results and known limits

On October 16, 2026, independent acceptance against the public HTTPS origin passed three hosted API scenarios and all 28 desktop/mobile browser cases, with no skips. No local server was used for those cases. Workouts/routines/sets/history/PRs, Norwegian foods and recipes/quantities/goals, health corrections/goals, recurring calendar activities and fulfillment, dashboard, empty accounts, timezone, record editing/deletion, session reload/reopening, logout, anonymous protection and cross-user isolation passed at the covered scope. All three disposable accounts were cleaned up.

Separate auth regression also passed on production: strong-symbol password login, UTF-8 password limit, unconfirmed-login denial, confirmation in a fresh browser context, URL-fragment removal, password login/reload/logout and single-use/redirect protection. The generated-link test removed its dedicated account. It does not prove inbox delivery or a new public signup email. The approved inbox already belongs to an existing unconfirmed account, which was preserved; the real deployed resend returned an email rate-limit error. Real production inbox confirmation remains outstanding. After the provider limit resets, use the login page's resend option, open the newest email and log in. Custom SMTP is necessary for arbitrary assessor addresses.

Final local checks passed lint, TypeScript, formatting, production build, 55 domain/PGlite tests, 16 UI tests and 25 native PostgreSQL tests. Hosted audit confirmed migrations 001-009, all 27 RLS tables, 35 policies, no private anonymous grants and 15 invoker-security authenticated-only RPCs. The tracked release source scan found no credentials/personal-email/artifact findings. Ten JavaScript assets served by the live login page were checked for the one non-public local environment value, with no matches. Browser security cases verified headers and inaccessible deployment/environment/script files. Vercel inspection reported READY; the inspected 15-minute runtime/error-request window returned zero error logs and zero HTTP 5xx records. These bounded checks do not promise future service availability.

Run lint, TypeScript, formatting, domain/PGlite, UI, isolated native PostgreSQL, production build, hosted API/RLS audit and browser suites. Record local-with-hosted-database results separately from deployed-site results. Conditional missing-credential skips are not passing live tests.

The production dependency audit reports zero vulnerabilities at preparation time. Five high findings remain in the development-only ESLint/glob chain; npm's proposed automatic fix downgrades the framework lint configuration, so it is not applied. Keep this limitation visible and recheck upstream fixes. No dependencies were upgraded to unrelated majors for deployment.

This prototype uses Hobby/free-tier services. No paid plan, custom domain, analytics drain or monitoring service has been purchased. Existing bounded recurrence/history loading, missing account recovery/export/deletion and deferred community/scanning/wearables remain documented limits.

Local auth regression passed against real Supabase: strong-symbol password, UTF-8 limit, unconfirmed denial, fresh-browser confirmation, token-fragment removal, login/reload/logout and replay/redirect safety. `node scripts/verify-auth.mjs` uses a generated link and removes only its marked disposable account; this is not evidence of email delivery. Set `FORM_AUTH_TEST_URL` to the deployed HTTPS origin to repeat independently. The default free mailer rejected custom template changes; no template or security policy was changed. Hosted site URL/allowlist changes were applied while retaining localhost callbacks. Use `npm run audit:source -- --tracked` for the release files when unrelated user skill files exist untracked.

## Vercel agent setup

Following Vercel's requested setup guide, CLI 64.3.1 is installed globally and authenticated as `buzzdot`. The Vercel plugin is installed at Codex user scope, and the shared `https://mcp.vercel.com` server is enabled with OAuth in the user's Codex configuration. The current chat has not loaded the new plugin commands/MCP tools; a later session reload is needed to execute the guide's MCP documentation/team read-only checks. CLI team/project reads have succeeded, and CLI deployment operations do not depend on reloading this chat. No MCP mutation was used.

Official references: [Vercel CLI deployments](https://vercel.com/docs/cli/deploy), [Git deployments](https://vercel.com/docs/git), [environment variables](https://vercel.com/docs/environment-variables), [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls), [Auth configuration API](https://supabase.com/docs/reference/api/v1-update-auth-service-config), and [Vercel's agent setup guide](https://vercel.com/get-started.md).
