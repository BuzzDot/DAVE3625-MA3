# Nutrition diary

Phase 3 uses real Supabase Auth and persistence at `/nutrition`. The old fictional editor is available only at `/demo/nutrition`. Start with `npm run dev`, log in, and open Nutrition. Search a Norwegian food name such as `Havregryn`, choose **Log**, enter grams or a listed serving, select date/category, and save. Saved meals are recipes: define ingredients in grams, set the recipe yield in servings, save, and log any fraction of a serving when consumed.

## Calculations and historical integrity

- Foods store energy and macros per 100 g of **edible** food. A serving has an explicit gram weight; volume is supported only where a food-specific conversion exists. There is no generic ml-to-g assumption.
- Food totals equal per-100-g values times actual grams divided by 100. A recipe sums each ingredient's consumed grams and divides by its declared serving yield. Logging a recipe in grams uses its summed ingredient weight; recipe cooking-water loss or final cooked weight is not inferred. Use foods in the appropriate cooked/raw state and choose a recipe yield consistently.
- SQL derives trusted names, macro values, source IDs/URLs, serving conversions, additional nutrients, and recipe ingredient composition on insertion. Client-supplied totals cannot replace them. Recipes and food definitions can change without recalculating earlier consumption.
- Quantity/unit corrections use the **original** basis, including the original recipe yield and serving weights. Changing meal/date leaves that basis intact. Replacing the food/recipe means deleting the entry and logging a new item. Optimistic revisions reject stale corrections. Legacy rows without a calculation basis keep their original totals; unsupported legacy quantity changes are rejected instead of guessed.
- SQL numeric arithmetic stores totals to three decimal places; display rounds to one decimal. Browser previews retain normal JavaScript precision and the database confirms persisted totals.
- Null means unknown per nutrient. If any ingredient/entry is missing a nutrient, the corresponding recipe/day total is unknown; other nutrients remain independently usable. Zero is displayed only when it is actually known. Recipe additional nutrients require all ingredients to supply a compatible unit; mixed/missing values remain unknown.
- Date-only entry uses local noon in the profile IANA timezone (Europe/Oslo default), converted to an actual UTC instant. Existing instants survive quantity corrections. Invalid/skipped local dates are rejected. History groups by persisted local date. No midnight/UTC guessing or planned-meal calorie counting occurs.
- Goal periods have inclusive start/end dates and cannot overlap. Setting a goal on a new date splits its preceding interval and stops at the next interval. Setting an existing start date corrects that period. Charts use the target valid on each recorded date; unlogged dates are omitted, and missing nutrients leave gaps.

## Matvaretabellen cache

The [official API documentation](https://www.matvaretabellen.no/api/) provides a Norwegian bulk feed at `https://www.matvaretabellen.no/api/nb/foods.json`. The source describes annual updates and permits local caching. This app performs **explicit trusted imports**, then searches the persisted database catalog locally in the browser. It never requests the bulk feed on each food search, and needs no API key or paid service. Attribution appears in the interface; each imported food retains its official source ID, page URL, import timestamp, and Norwegian keywords.

Mappings: `calories.quantity` in kcal; `Protein`, `Karbo`, and `Fett` constituent amounts in grams. Both missing and explicit-null quantities remain null; known zero remains zero. Supported official portions must be measured in grams. Selected additional constituents are `Fiber`, `Mono+Di` (sugars), `Mettet` (saturated fat), `Na`, `Ca`, and `Fe`, with original units and nutrient source IDs. Energy is taken from the published kcal value rather than reconstructed from macros.

An authorized, linked Supabase CLI is required for catalog maintenance. Credentials are read only into tooling process memory; app code continues using the public key and each user's verified session.

```powershell
npm run foods:preview
npm run foods:import
```

Preview validates the actual feed without modifying anything. Import validates all records before opening a transaction, upserts shared rows by `(source, external_id)`, and rolls back the whole batch on failure. Deterministic initial UUIDs preserve identity; conflict updates retain existing IDs. Personal foods and recorded snapshots are untouched. Repeated import was verified against the hosted database with 2,121 source IDs and no duplicates. Source removals are not automatically deleted or archived. Refresh explicitly after a source release; there is no scheduled import job yet.

## Security and boundaries

Migrations 006 and 007 extend the existing relational model without resets or rewrites of recorded entries. `recipe_favorites` has RLS, ownership-safe FKs and explicit SELECT/INSERT/DELETE grants. All nutrition RPCs use invoker security, derive ownership from `auth.uid()`, and deny anonymous execution. Food/recipe references must be readable and owned where appropriate. Personal foods cannot claim official-source provenance. Archived foods/recipes leave history readable; existing recipe compositions retain access to their referenced archived foods.

The private dashboard/calendar show real consumed nutrition beside separate plans and health records. Calendar schedules saved recipes using immutable SQL-derived composition/basis snapshots; actual fractional servings are logged atomically once per occurrence. Nutrition edits retain that original basis, and deletion reopens the plan. See [HEALTH-CALENDAR.md](HEALTH-CALENDAR.md). Community meal copying, scanning and public publishing remain future work.

The current catalog and personal history are loaded in stable, paginated 500-row database batches, then filtered/rendered locally (30 food matches at a time). This keeps search fast for the present catalog and avoids the Supabase row-limit truncation bug. Larger catalogs or long-lived accounts should move to indexed server search, date-bounded history and SQL aggregates. Full offline editing/background sync, nested recipes, cooked-yield inference, custom micronutrient editing and scheduled source refresh are not implemented.

## Verification

`npm test` covers serving/recipe arithmetic, null propagation, timezones/DST, official feed mapping/schema rejection, stable import IDs, historical basis retention, direct-write snapshot protection, owner isolation, goal intervals, invalid children and legacy records. `test:postgres` repeats SQL invariants in an isolated PostgreSQL 17 cluster. UI tests cover calendar hydration/date-to-summary synchronization and preserve the workout editor/autosave suite.

`npm run test:hosted` creates two disposable accounts via existing authorized CLI access, runs both strength and nutrition API scenarios, builds, runs desktop/mobile browser workflows, then removes only those fixtures. Nutrition workflows exercise official search, quantity logging, custom food creation/edit/favorites/archive, recipe creation/edit/favorites/portions/archive, goal configuration, macro chart selection, entry corrections/deletion, calendar summaries, and fresh-browser persistence. These are ordinary public-key authenticated API/RLS operations; admin confirmation of fixtures is not a new public signup test. Phase 2 separately verified actual signup email confirmation.
