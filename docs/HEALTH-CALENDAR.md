# Health diary and calendar

The private dashboard (`/`), `/calendar`, and `/health` use authenticated Supabase records. Fictional previews remain at `/demo/dashboard` and `/demo/calendar`. Failed live reads never substitute fixtures.

## Measurements and goals

Select any date in Calendar and use **Log health**. Health has its own navigation item. Log steps (count), water (ml), sleep (minutes), weight (kg), resting/other heart rate (bpm), and body measurements (cm). Arm, thigh, calf, waist, chest and hips have metric codes; **Other measurement** accepts a custom name. No cup/serving conversion is inferred.

Water entries and sleep sessions add within their stored local date. Steps are a daily total: the latest timestamped observation wins. Weight, resting heart rate and body measurements use the latest value; other heart rate uses an arithmetic daily average. Individual observations retain their timestamps, source and notes. Edit/delete checks revisions to reject stale tabs. These are recorded summaries, without fitness/recovery scores.

Sleep accepts a duration, or both local start/end times. With both, elapsed UTC minutes determine duration, including DST; the end determines the waking date. Quality is optional, 1–5. Blank duration/interval is rejected. Zero is shown only for a permitted explicit zero. Source/external IDs support future owner-scoped import deduplication. Provider synchronization remains disabled pending a cross-provider overlap/priority policy.

Step/water/sleep/weight targets have effective dates. A new date splits the preceding period and stops at the next one; an existing start date corrects that period. Nutrition goals remain in Nutrition. Summaries select the goal applicable to the displayed date. Weight is a target without a percentage score; resting heart rate has no target score. Charts support 7/30/90 calendar days, missing-value gaps and an accessible values disclosure.

Settings exposes an IANA diary timezone, default Europe/Oslo. New entries/plans use it; older records retain their original dates/timezones. The strength logger retains explicitly labeled UTC correction fields.

## Scheduling

Calendar provides month/week/day views, previous/next, Today and date selection. A day shows plans, consumed meals/macros, completed workout links, health totals and observations. Plans never create completed records. Past-date unfinished plans display **Missed (uncompleted plan)**; missed is derived, while planned/completed/skipped/cancelled are persisted. Cancellation retains the occurrence for history.

Create workout routines in Workouts or recipes under Nutrition's Saved meals. Under **Schedule an activity**, choose the activity type, then select from **Workout routines** or **Saved meals**. Set local date/time and optional weekdays, then **Preview schedule** before saving. Each series is finite: at most one year / 366 occurrences, default 12. End date and count can both apply; the first bound reached wins. Without an end date the one-year horizon applies. Extend a plan by scheduling another range; there is no background rolling materialization.

The local connected-diary update also adds **Schedule** to routine and saved-meal cards. It opens Calendar at the scheduling form with the correct activity type and readable template preselected. A recipe carries its currently selected nutrition date; routines created through Calendar's empty-state link retain that planning date. Calendar's meal empty-state link opens Saved meals directly at the selected date. These shortcuts never save a plan automatically: preview and explicit saving are still required. Missing/archived/other-owner IDs do not become selector options. If a save request is interrupted, its reviewed preview remains available for an explicit retry with the same operation ID. These additions are local; no deployment was performed.

If no templates are available, first use **Workouts → Create routine**, add an exercise/set and save, or **Nutrition → Saved meals → Create recipe**, add an ingredient and save. Return to Calendar in the same account and select the matching activity type. Completed workouts, individual foods and consumed meals do not automatically become reusable templates. Archived templates and other users' templates are excluded. The October 18 local UI correction makes this prerequisite explicit, disables an empty selector and links to these pages; it is awaiting deployment, per the user's instruction.

Rules store weekdays, local time, timezone, dates and count. Occurrences have stable UUIDs and a unique rule/original-date key. Creation is atomic and retrying its caller-generated ID cannot duplicate the series. SQL derives routine/recipe snapshots from readable owned templates. Template edits never rewrite planned snapshots or completed records.

**Edit activity** changes title, notes, status or date/time, either singly or for this and future unedited occurrences. Future edits apply a common date offset/time/title/status to the finite saved set; they preserve other individual exceptions and all started/completed workouts. Single edits set an explicit exception flag. The original occurrence date remains the stable key after moves. Rule columns describe the original recurrence; occurrence overrides store changes. **Remove recurring schedule** cancels every unrecorded occurrence, including exceptions, and retires the rule, retaining completed records and started workouts.

Recurrence advances local dates rather than adding UTC weeks. Each date resolves to an instant in its stored zone. Nonexistent DST clocks/skipped dates are rejected in preview and SQL, rolling back the entire save. Repeated clocks choose the later standard-time instant, matching PostgreSQL. Sleep duration across DST uses elapsed time.

## Completing plans

Workouts show intended exercises/sets. **Start workout** atomically creates one linked draft from that snapshot and opens the existing logger. Repeated starts resume the same draft. Existing strength RPCs save actual sets, complete the plan and reopen it when its session is deleted. Ad hoc workouts still work. The action supplies its start instant so small clock differences between hosted PostgreSQL and the logger cannot make an immediate finish appear earlier than the start; SQL bounds it to five minutes around database time.

For a planned recipe, enter actual fractional servings and consumed date, then **Log as consumed**. SQL uses the planned immutable nutrition basis, preserving unknown nutrients and serving yield. One consumed recipe entry fulfills an occurrence; retries return it instead of duplicating intake. Adjust/delete actual consumption in Nutrition using its existing original-basis calculations. Deletion reopens the plan. Use separate occurrences for independently logged portions. Consumption on another date appears on that actual date; its plan remains completed on the original planned date.

## Security and limits

Forward migrations 008/009 extend existing RLS tables without resets. Writes verify auth in server actions and remain invoker-security/owner-filtered in SQL. Composite owner/kind FKs, trusted snapshot triggers, source uniqueness and occurrence/intake uniqueness protect lineage and deduplication. Health, profiles and schedules remain private.

Repositories paginate complete personal histories/catalogs in stable 500-row batches, matching existing modules. Date-bounded queries and server aggregates remain a scaling improvement. Metric storage is extensible, but arbitrary user-defined units/aggregation formulas, arbitrary RRULEs, drag-and-drop, indefinite schedules, Garmin, scanning and public program copying are outside this phase. Browser tests use disposable confirmed accounts, public-key RLS access and fresh contexts; isolated SQL harnesses do not replace hosted testing. See PLAN for check results and SETUP for repeatable commands.
