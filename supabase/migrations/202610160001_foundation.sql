-- Canonical units: kg, cm, meters, seconds, ml, kcal; nutrition per 100 g.
-- Target: Supabase PostgreSQL 17. No hosted project or seeded user required.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  timezone text not null default 'Europe/Oslo',
  unit_system text not null default 'metric' check (unit_system in ('metric','imperial')),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  muscle_group text not null,
  equipment text,
  tracking_type text not null default 'reps_weight' check (tracking_type in ('reps_weight','reps','duration','distance_duration')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  kcal_per_100g numeric(10,3) not null check (kcal_per_100g >= 0),
  protein_per_100g numeric(10,3) not null check (protein_per_100g between 0 and 100),
  carbs_per_100g numeric(10,3) not null check (carbs_per_100g between 0 and 100),
  fat_per_100g numeric(10,3) not null check (fat_per_100g between 0 and 100),
  source text not null default 'manual',
  external_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create unique index foods_catalog_external on public.foods (source, external_id) where owner_id is null and external_id is not null;
create unique index foods_personal_external on public.foods (owner_id, source, external_id) where owner_id is not null and external_id is not null;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null check (kind in ('workout','meal','mixed')),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.program_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null,
  version integer not null check (version > 0),
  title_snapshot text not null,
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private','public')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (program_id, owner_id) references public.programs(id, owner_id) on delete cascade,
  unique (program_id, version),
  unique (id, owner_id)
);
create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  program_version_id uuid not null,
  day_offset integer not null check (day_offset >= 0),
  position integer not null check (position >= 0),
  kind text not null check (kind in ('workout','meal')),
  title text not null,
  -- Self-contained, versioned interchange format; never mutable live template pointers.
  template_snapshot jsonb not null check (jsonb_typeof(template_snapshot) = 'object'),
  snapshot_format integer not null default 1 check (snapshot_format > 0),
  foreign key (program_version_id, owner_id) references public.program_versions(id, owner_id) on delete cascade,
  unique (program_version_id, day_offset, position)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  notes text,
  source_version_id uuid references public.program_versions(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null,
  exercise_id uuid not null references public.exercises(id),
  position integer not null check (position >= 0),
  notes text,
  foreign key (routine_id, owner_id) references public.routines(id, owner_id) on delete cascade,
  unique (routine_id, position),
  unique (id, owner_id)
);
create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  routine_exercise_id uuid not null,
  position integer not null check (position >= 0),
  target_reps integer check (target_reps >= 0),
  target_weight_kg numeric(9,3) check (target_weight_kg >= 0),
  target_rpe numeric(3,1) check (target_rpe between 0 and 10),
  target_rir integer check (target_rir between 0 and 10),
  rest_seconds integer check (rest_seconds >= 0),
  foreign key (routine_exercise_id, owner_id) references public.routine_exercises(id, owner_id) on delete cascade,
  unique (routine_exercise_id, position)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  servings numeric(9,3) not null check (servings > 0),
  instructions text,
  source_version_id uuid references public.program_versions(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  food_id uuid not null references public.foods(id),
  grams numeric(10,3) not null check (grams > 0),
  position integer not null check (position >= 0),
  foreign key (recipe_id, owner_id) references public.recipes(id, owner_id) on delete cascade,
  unique (recipe_id, position)
);
create table public.food_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  created_at timestamptz not null default now(),
  primary key (owner_id, food_id)
);
create table public.program_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  program_version_id uuid not null references public.program_versions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, program_version_id)
);

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout','meal')),
  routine_id uuid,
  recipe_id uuid,
  timezone text not null,
  starts_on date not null,
  ends_on date check (ends_on >= starts_on),
  recurrence_rule text not null, -- RFC 5545, validated by future recurrence service.
  foreign key (routine_id, owner_id) references public.routines(id, owner_id),
  foreign key (recipe_id, owner_id) references public.recipes(id, owner_id),
  check ((kind = 'workout' and routine_id is not null and recipe_id is null) or (kind = 'meal' and recipe_id is not null and routine_id is null)),
  unique (id, owner_id)
);
create table public.scheduled_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout','meal')),
  title text not null,
  scheduled_at timestamptz not null,
  timezone text not null,
  status text not null default 'planned' check (status in ('planned','cancelled','skipped','completed')),
  routine_id uuid,
  recipe_id uuid,
  rule_id uuid,
  occurrence_date date,
  template_snapshot jsonb not null check (jsonb_typeof(template_snapshot) = 'object'),
  source_version_id uuid references public.program_versions(id),
  foreign key (routine_id, owner_id) references public.routines(id, owner_id),
  foreign key (recipe_id, owner_id) references public.recipes(id, owner_id),
  foreign key (rule_id, owner_id) references public.schedule_rules(id, owner_id),
  check ((kind = 'workout' and recipe_id is null) or (kind = 'meal' and routine_id is null)),
  check ((rule_id is null and occurrence_date is null) or (rule_id is not null and occurrence_date is not null)),
  unique (rule_id, occurrence_date),
  unique (id, owner_id),
  unique (id, owner_id, kind)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid,
  scheduled_activity_id uuid,
  kind text not null default 'workout' check (kind = 'workout'),
  title_snapshot text not null,
  started_at timestamptz not null,
  timezone text not null default 'UTC',
  completed_at timestamptz check (completed_at >= started_at),
  notes text,
  source text not null default 'manual',
  external_id text,
  foreign key (routine_id, owner_id) references public.routines(id, owner_id),
  foreign key (scheduled_activity_id, owner_id, kind) references public.scheduled_activities(id, owner_id, kind),
  unique (owner_id, source, external_id),
  unique (scheduled_activity_id),
  unique (id, owner_id)
);
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null references public.exercises(id),
  name_snapshot text not null,
  tracking_type_snapshot text not null check (tracking_type_snapshot in ('reps_weight','reps','duration','distance_duration')),
  position integer not null check (position >= 0),
  notes text,
  foreign key (session_id, owner_id) references public.workout_sessions(id, owner_id) on delete cascade,
  unique (session_id, position),
  unique (id, owner_id)
);
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_exercise_id uuid not null,
  position integer not null check (position >= 0),
  set_type text not null default 'working' check (set_type in ('warmup','working','drop','failure')),
  reps integer check (reps >= 0),
  weight_kg numeric(9,3) check (weight_kg >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  distance_m numeric(12,3) check (distance_m >= 0),
  rpe numeric(3,1) check (rpe between 0 and 10),
  rir integer check (rir between 0 and 10),
  completed_at timestamptz,
  notes text,
  foreign key (session_exercise_id, owner_id) references public.session_exercises(id, owner_id) on delete cascade,
  check (reps is not null or duration_seconds is not null or distance_m is not null),
  unique (session_exercise_id, position)
);

create table public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id),
  recipe_id uuid,
  scheduled_activity_id uuid,
  kind text not null default 'meal' check (kind = 'meal'),
  logged_at timestamptz not null,
  local_date date not null,
  timezone text not null default 'UTC',
  meal_slot text not null check (meal_slot in ('breakfast','lunch','dinner','snack','other')),
  name_snapshot text not null,
  quantity numeric(10,3) not null check (quantity > 0),
  unit_snapshot text not null,
  grams_snapshot numeric(10,3) check (grams_snapshot > 0),
  -- Totals for the logged quantity, not mutable references to current food values.
  kcal_snapshot numeric(12,3) not null check (kcal_snapshot >= 0),
  protein_snapshot numeric(12,3) not null check (protein_snapshot >= 0),
  carbs_snapshot numeric(12,3) not null check (carbs_snapshot >= 0),
  fat_snapshot numeric(12,3) not null check (fat_snapshot >= 0),
  source text not null default 'manual',
  external_id text,
  verified_at timestamptz,
  foreign key (recipe_id, owner_id) references public.recipes(id, owner_id),
  foreign key (scheduled_activity_id, owner_id, kind) references public.scheduled_activities(id, owner_id, kind),
  check (not (food_id is not null and recipe_id is not null)),
  unique (owner_id, source, external_id)
);

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  starts_on date not null,
  ends_on date check (ends_on >= starts_on),
  kcal numeric(10,3) not null check (kcal > 0),
  protein_g numeric(10,3) not null check (protein_g >= 0),
  carbs_g numeric(10,3) not null check (carbs_g >= 0),
  fat_g numeric(10,3) not null check (fat_g >= 0),
  unique (owner_id, starts_on)
);

create table public.health_metrics (
  code text primary key,
  unit text not null,
  aggregation text not null check (aggregation in ('sum','latest','average')),
  minimum numeric not null default 0,
  maximum numeric not null check (maximum > minimum)
);
insert into public.health_metrics values
  ('steps','count','sum',0,200000), ('water','ml','sum',0,20000),
  ('sleep','minutes','sum',0,1440), ('weight','kg','latest',0,700),
  ('waist','cm','latest',0,400), ('chest','cm','latest',0,400),
  ('hips','cm','latest',0,400), ('heart_rate','bpm','average',0,300),
  ('resting_heart_rate','bpm','latest',0,300);
create table public.health_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  metric_code text not null references public.health_metrics(code),
  value numeric(12,3) not null check (value >= 0),
  observed_at timestamptz not null,
  local_date date not null,
  timezone text not null,
  source text not null default 'manual',
  external_id text,
  notes text,
  created_at timestamptz not null default now(),
  unique (owner_id, source, external_id, metric_code)
);
create table public.health_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  metric_code text not null references public.health_metrics(code),
  target numeric(12,3) not null check (target > 0),
  starts_on date not null,
  ends_on date check (ends_on >= starts_on),
  unique (owner_id, metric_code, starts_on)
);
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_account_id text not null,
  status text not null check (status in ('active','revoked','error')),
  last_synced_at timestamptz,
  -- Tokens belong in a server-side vault, never this client-readable table.
  unique (owner_id, provider, external_account_id),
  unique (id, owner_id)
);
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  idempotency_key text not null,
  started_at timestamptz,
  finished_at timestamptz check (finished_at >= started_at),
  error_code text,
  foreign key (connection_id, owner_id) references public.integration_connections(id, owner_id) on delete cascade,
  unique (connection_id, idempotency_key)
);

-- FK indexes and owner-first access paths for RLS and common history queries.
do $$ declare t text; begin
  foreach t in array array['exercises','foods','programs','program_versions','program_items','routines','routine_exercises','routine_sets','recipes','recipe_ingredients','schedule_rules','scheduled_activities','workout_sessions','session_exercises','workout_sets','nutrition_entries','health_observations','health_goals','integration_connections','import_jobs'] loop
    execute format('create index %I on public.%I(owner_id)', t || '_owner_idx', t);
  end loop;
end $$;
create index schedule_owner_time on public.scheduled_activities(owner_id, scheduled_at);
create index sessions_owner_time on public.workout_sessions(owner_id, started_at desc);
create index nutrition_owner_date on public.nutrition_entries(owner_id, local_date, meal_slot);
create index observations_owner_metric_time on public.health_observations(owner_id, metric_code, observed_at desc);
create index observations_owner_date on public.health_observations(owner_id, local_date);
create index session_exercise_history on public.session_exercises(owner_id, exercise_id, session_id);
create index sets_history on public.workout_sets(owner_id, session_exercise_id, completed_at);
create index program_discovery on public.program_versions(published_at desc) where visibility = 'public' and published_at is not null;
create index routine_exercises_exercise on public.routine_exercises(exercise_id);
create index ingredients_food on public.recipe_ingredients(food_id);
create index nutrition_food on public.nutrition_entries(food_id);
create index nutrition_recipe on public.nutrition_entries(recipe_id);
create index nutrition_schedule on public.nutrition_entries(scheduled_activity_id);
create index schedules_routine on public.scheduled_activities(routine_id);
create index schedules_recipe on public.scheduled_activities(recipe_id);
create index schedules_rule on public.scheduled_activities(rule_id);
create index rules_routine on public.schedule_rules(routine_id);
create index rules_recipe on public.schedule_rules(recipe_id);
create index sessions_routine on public.workout_sessions(routine_id);
create index routines_provenance on public.routines(source_version_id);
create index recipes_provenance on public.recipes(source_version_id);
create index schedules_provenance on public.scheduled_activities(source_version_id);
create index favorites_food on public.food_favorites(food_id);
create index favorites_program on public.program_favorites(program_version_id);
create index goals_metric on public.health_goals(metric_code);
create index observations_metric on public.health_observations(metric_code);
create index nutrition_goals_owner_date on public.nutrition_goals(owner_id, starts_on desc);

commit;
