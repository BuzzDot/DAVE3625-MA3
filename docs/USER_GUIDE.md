# Using Form

Form is a private fitness diary. Logged records belong to your signed-in account. Screens marked **DEMO WORKSPACE** are temporary examples and reset on reload.

## Sign in and set your timezone

Log in with a confirmed account. For a new account, choose Sign up, follow the newest confirmation email, then log in with your password. The default email provider has recipient/rate limits; use an existing confirmed account if mail is unavailable. Password recovery is not implemented.

In Settings, set your diary's IANA timezone, such as `Europe/Oslo`. New records and schedules use that timezone; past records retain their recorded dates.

## Record a workout

1. In Workouts, create a routine, add exercises and target sets, then save. Search the exercise library or create a personal exercise.
2. Start the routine or an ad hoc workout. Enter actual reps/weight and mark each performed set complete. Finish the workout to include it in completed history and Progress.
3. Open a saved workout to review/correct it. Incomplete sets do not count toward working volume or personal records. Routine edits do not rewrite past sessions.

Wait for saved feedback. If a routine save fails, keep the page open and retry; unsaved routine forms are not guaranteed to survive navigation. Workout logging has separate autosave/device recovery feedback.

## Log food and saved meals

Choose a date in Nutrition. In Food library, search Norwegian food names, choose Log, confirm the meal category, quantity and gram/serving unit, then save. Create food accepts label values per 100 g and explicit gram-based serving sizes. Leave unknown nutrients blank; zero means a known zero.

In Saved meals, create a recipe from foods and ingredient gram weights and set its serving yield. Log portion records the amount actually eaten, including fractional servings. The Diary's Saved meal buttons carry the chosen meal category into this flow. Edit/Remove on diary entries corrects/deletes consumption. Removing a catalog food/recipe archives it and preserves history.

Goals & history provides dated calorie/macronutrient targets and trends. Dashboard and Nutrition compare recorded totals to the target applicable to that date. Planned meals never count as intake.

## Look up a barcode (local release addition)

1. Open Nutrition → Food library → Scan a food barcode.
2. Choose Use camera in a compatible browser over HTTPS (localhost also supports camera permissions), or type the 8, 12, 13 or 14 digit printed code and choose Find product.
3. Check the product, source and calories/protein/carbohydrates/fat per 100 g. Choose Review food draft, compare/correct the values against the package, then Save food. This creates a personal food without logging consumption.
4. Search for that saved food, choose Log, confirm the consumed quantity, meal/date and unit, then Save food entry. It can also be a recipe ingredient.

Camera frames stay on your device; only the decoded/typed barcode goes to lookup. Stop camera or leave the Food library to release the camera. Unsupported browsers, denied permissions and failed lookups leave manual barcode entry, ordinary food search and Create food available.

Equivalent leading-zero barcode formats are accepted when Open Food Facts returns the same product under its normalized code. Browser verification uses a synthetic camera and simulated decoder output; physical-camera and Safari support still need a real-device check. No Open Food Facts account is required.

Open Food Facts data may be incomplete or incorrect. Only confirmed gram-based labels are supported; liquids/unclear bases require verified manual values per 100 g. Unknown nutrients remain unknown. Each saved draft is a personal copy: scanning again does not automatically update/deduplicate it. Reuse the existing food rather than saving another copy. Source/barcode/retrieval information is kept in its editable description, not a verified integration record.

## Plan workouts and meals

Create a routine or saved recipe first. Choose Schedule on its card, or select its type/template in Calendar. Set local date/time, optionally repeating weekdays and an end/count, then Preview schedule and explicitly save. Month/week/day views and date controls show plans alongside actual records.

Start workout from a planned workout to open its logger. For a planned recipe, confirm the actual serving amount and choose Log as consumed. Edit/cancel an occurrence or its future schedule when plans change; cancellation retains history.

## Health, dashboard and progress

In Health, choose a date and log steps, water, sleep, weight, heart rate or body measurements. Steps are daily totals; water entries add together. Sleep accepts minutes or an actual start/end interval. Edit/delete measurements and set dated targets as needed. Missing observations display as unlogged, not zero.

Dashboard summarizes actual health/nutrition, upcoming plans and recent workouts. Progress displays completed strength history. Health and Nutrition have their own date/metric charts. Empty charts for a new account are expected.

## Current limits

Garmin import/sync, nutrition-label OCR, meal-photo estimates and public community publishing are not implemented. Community is a labeled demo. Local release additions need a separately approved deployment before appearing on the existing Vercel site. See [final QA evidence](FINAL_QA.md) for tested behavior and remaining device/inbox checks.
