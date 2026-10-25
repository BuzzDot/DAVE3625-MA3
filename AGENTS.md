# Engineering instructions

## Product and scope

Form is a private fitness diary with workout, nutrition, health, calendar, and future community modules. Read `docs/ARCHITECTURE.md` and `docs/PLAN.md` before substantial work. Update both when decisions or delivery status change. Never describe demo UI, planned work, or unconnected services as completed production features.

## Default autonomous MVP workflow

- Deliver a functional, usable assignment MVP first. Prioritize explicit assignment requirements and broken core user journeys over optional features, architectural perfection, extensive redesigns or premature optimization.
- Make routine technical and implementation decisions independently. Continue through implementation, verification and fixes without asking for approval between ordinary development steps. Ask only when required information or authorization is genuinely missing.
- Preserve working behavior and existing changes. Accept reasonable technical debt when it helps delivery; document significant compromises and remaining limits. Keep the experience intuitive, responsive and reasonably polished without spending excessive time on cosmetics.
- Authentication, authorization, user-data isolation and sensitive-information protection are mandatory, including for a prototype.
- Barcode lookup with manual entry and optional native camera decoding is explicitly authorized for the current release. Garmin integration and nutrition-label OCR remain future enhancements. Meal-photo macro estimation is excluded. Do not implement deferred integrations or deploy as part of an ordinary development cycle without applicable explicit authorization.

For every development task, unless its scope explicitly requires otherwise:

1. **Understand:** Inspect relevant code, assignment requirements and project documentation. If original assignment material is unavailable, state that limitation and use the documented acceptance criteria without inventing requirements.
2. **Plan:** Identify necessary changes and their impact, with planning proportional to complexity.
3. **Implement:** Make the required changes autonomously, keeping the scope practical for the MVP.
4. **Test:** Run applicable automated checks, including the verification commands below; use appropriate API/integration tests for backend changes.
5. **Inspect and interact:** Start or access the app with available browser automation. Exercise affected user journeys through real clicks, form input and observable results, including representative desktop/mobile layouts for UI changes. Inspect browser errors and failed requests when supported. Screenshots and builds alone do not establish end-to-end functionality.
6. **Fix and reverify:** Resolve important failures, regressions and usability problems, then repeat the relevant automated and browser checks.
7. **Document:** Update delivery status and relevant documentation. Summarize implemented changes, checks, limitations, significant accepted debt and next priorities. Distinguish browser-interaction evidence, automated-only evidence and unverified behavior.

Browser verification is standard for UI, navigation, forms, authentication and user-workflow changes. Backend-only work may use API/integration checks when browser testing adds no value. If browser automation or credentials are unavailable, report that explicitly; never claim skipped or unperformed visual/end-to-end checks passed. Use dedicated authorized test accounts and safe test data, preserving real user records.

## Stack and conventions

- Next.js App Router, strict TypeScript, React, Tailwind CSS v4, shadcn/ui conventions, Recharts, Supabase Auth/PostgreSQL. Keep the lockfile and use compatible stable versions.
- Prefer small domain components and server components; use client components for interaction and charts. Reuse UI primitives in `src/components/ui` and `cn` in `src/lib/utils.ts`.
- Mobile-first, keyboard accessible, labeled inputs, visible focus, 44px touch controls, readable contrast, and reduced-motion support. Verify desktop and mobile layouts.
- Separate fixtures (`src/lib/demo`) from server-only production access (`src/lib/supabase`). Never fall back silently from real data to fixtures. Demo changes are explicitly temporary.
- Private diary routes are `/`, `/calendar`, `/health`, `/workouts`, `/workouts/[id]`, `/nutrition`, `/progress`, and `/settings`. Dashboard/calendar/health use actual data. Explicit demo routes remain under `/demo`. Read `docs/HEALTH-CALENDAR.md` for health, recurrence, timezone and fulfillment rules. Read `docs/SETUP.md` for hosted verification and `docs/NUTRITION.md` for nutrition/import rules. Never claim skipped credential-backed tests passed.
- Use metric canonical storage and convert at display boundaries. Persist instants as `timestamptz` and user-local dates/time zones explicitly. Do not treat missing observations as zero.

## Data and security

- Keep templates, scheduled occurrences, and completed records distinct. Copy snapshot values when logging; never recalculate history from mutable catalog/template rows.
- Stable exercise IDs and individual set rows are required. Archive referenced catalogs/templates instead of destructive deletion.
- Every user-owned row requires RLS, explicit grants, owner indexes, and ownership-safe foreign keys. FK existence alone does not authorize reference to another user's row.
- Add forward-only, versioned SQL migrations. Do not edit deployed migrations. Migrations 001-009 are deployed to the configured hosted project; use new forward migrations for every change. Test changes with actual SQL and two user roles. Preserve legacy nutrition snapshots without inventing a recalculation basis.
- Public sharing applies only to deliberately published, immutable program versions and their snapshots. Health records and private profiles remain private. Personal program copies are independent and retain provenance.
- Record source and external ID, with owner-scoped uniqueness for imports. Integration tokens stay in a server-side vault, outside readable application tables.
- Never commit secrets, use service-role credentials in the browser, trust client-supplied owner IDs, disable RLS to make a feature work, or invent a signed-in user. Verify real auth on the server before production reads/writes.
- Implement authenticated writes as validated server actions/route handlers. Multi-row logging, copy, and schedule operations must be atomic. Add a real session refresh mechanism when implementing authentication.
- Nutrition totals are calculated by invoker-security SQL from readable foods/recipes, never supplied by the browser. Quantity edits use the recorded basis and serving conversions; current catalog/recipe changes must not rewrite consumption history. Null means unknown for every individual nutrient and affected total.
- Shared external foods are ingested only by explicit trusted tooling, deduplicated by source/external ID. Do not download Matvaretabellen's bulk feed on searches or grant clients shared-catalog writes. Keep Norwegian names, source URLs/IDs, units, and attribution. Recipe templates and planned meals never count toward intake.

## Verification and handoff

- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:ui`, and `npm run build`. Run `npm run test:e2e` for UI changes when Chromium is available. Run `npm run test:postgres` for schema changes when native PostgreSQL binaries are available; `db:types` introspects that isolated migrated cluster. Real Supabase verification uses `test:supabase` and the conditional browser workflow with dedicated confirmed test accounts.
- Finish builds before starting browser-test servers. Never rebuild or replace `.next` while a verification server is using that output. `test:hosted` runs the production build, real API checks and the same Playwright suite with disposable credentials; use it for complete authenticated verification when the linked test tooling is available.
- Add meaningful tests for domain invariants, authorization, and user-visible interactions; avoid tests that merely reproduce implementation details.
- Do not run destructive resets against a remote database. Local Supabase reset instructions apply only to the isolated local stack.
- Document checks, limitations, configuration, blockers, completed work, and the next phase. Keep routine implementation decisions autonomous. Hosted inspection and forward migration application are authorized for Phase 2 verification; never reset hosted data.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
