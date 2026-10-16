begin;

alter table public.routines add column revision integer not null default 1 check (revision > 0);
alter table public.workout_sessions add column revision integer not null default 1 check (revision > 0);
alter table public.routine_sets add column set_type text not null default 'working'
  check (set_type in ('warmup','working','drop','failure'));
alter table public.routine_sets add column notes text;

create table public.exercise_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  created_at timestamptz not null default now(),
  primary key (owner_id, exercise_id)
);
create index exercise_favorites_exercise on public.exercise_favorites(exercise_id);
alter table public.exercise_favorites enable row level security;
grant select, insert, delete on public.exercise_favorites to authenticated;
create policy own_favorites on public.exercise_favorites for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create function public.guard_exercise_favorite() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.exercises where id = new.exercise_id and (owner_id is null or owner_id = new.owner_id)) then
    raise exception 'Exercise is unavailable' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger exercise_favorite_reference before insert on public.exercise_favorites
  for each row execute function public.guard_exercise_favorite();
revoke execute on function public.guard_exercise_favorite() from public, anon, authenticated;

-- Stable, migration-owned catalog IDs. No test accounts or personal data.
insert into public.exercises (id, name, muscle_group, equipment, tracking_type) values
 ('f0000000-0000-4000-8000-000000000001','Barbell bench press','Chest','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000002','Barbell back squat','Legs','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000003','Conventional deadlift','Back','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000004','Overhead press','Shoulders','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000005','Bent-over row','Back','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000006','Romanian deadlift','Legs','Barbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000007','Incline dumbbell press','Chest','Dumbbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000008','Dumbbell shoulder press','Shoulders','Dumbbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000009','Dumbbell lateral raise','Shoulders','Dumbbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000010','Dumbbell curl','Arms','Dumbbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000011','Goblet squat','Legs','Dumbbell','reps_weight'),
 ('f0000000-0000-4000-8000-000000000012','Lat pulldown','Back','Cable','reps_weight'),
 ('f0000000-0000-4000-8000-000000000013','Seated cable row','Back','Cable','reps_weight'),
 ('f0000000-0000-4000-8000-000000000014','Triceps pushdown','Arms','Cable','reps_weight'),
 ('f0000000-0000-4000-8000-000000000015','Leg press','Legs','Machine','reps_weight'),
 ('f0000000-0000-4000-8000-000000000016','Leg curl','Legs','Machine','reps_weight'),
 ('f0000000-0000-4000-8000-000000000017','Leg extension','Legs','Machine','reps_weight'),
 ('f0000000-0000-4000-8000-000000000018','Standing calf raise','Legs','Machine','reps_weight'),
 ('f0000000-0000-4000-8000-000000000019','Push-up','Chest','Bodyweight','reps'),
 ('f0000000-0000-4000-8000-000000000020','Pull-up','Back','Bodyweight','reps');

-- Invoker-security RPCs provide transactions without bypassing RLS.
-- Revision checks reject stale tabs; caller-generated IDs make creates retry-safe.
create function public.save_strength_routine(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid(); rid uuid := (p_document->>'id')::uuid;
  expected integer := (p_document->>'revision')::integer;
  next_revision integer; ex jsonb; s jsonb; epos integer := 0; spos integer;
  slot uuid; visible public.exercises%rowtype;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if rid is null or expected is null or expected < 0 or char_length(trim(coalesce(p_document->>'name',''))) not between 1 and 200
     or char_length(coalesce(p_document->>'notes','')) > 5000
     or jsonb_typeof(p_document->'exercises') is distinct from 'array' then
    raise exception 'Invalid routine' using errcode = '23514';
  end if;
  if jsonb_array_length(p_document->'exercises') not between 1 and 40 then raise exception 'Use 1–40 exercises' using errcode = '23514'; end if;
  if expected = 0 then
    insert into public.routines (id,owner_id,name,notes) values (rid,uid,trim(p_document->>'name'),p_document->>'notes') returning revision into next_revision;
  else
    update public.routines set name=trim(p_document->>'name'),notes=p_document->>'notes',revision=revision+1
      where id=rid and owner_id=uid and revision=expected and archived_at is null returning revision into next_revision;
    if not found then raise exception 'Record changed or unavailable. Reload before saving.' using errcode = '40001'; end if;
    delete from public.routine_exercises where routine_id=rid and owner_id=uid;
  end if;
  for ex in select value from jsonb_array_elements(p_document->'exercises') loop
    select * into visible from public.exercises where id=(ex->>'exerciseId')::uuid and (owner_id is null or owner_id=uid) and archived_at is null;
    if not found or visible.tracking_type not in ('reps_weight','reps') then raise exception 'Strength exercise unavailable' using errcode = '23514'; end if;
    if jsonb_typeof(ex->'sets') is distinct from 'array' or char_length(coalesce(ex->>'notes','')) > 2000 then raise exception 'Invalid exercise' using errcode = '23514'; end if;
    if jsonb_array_length(ex->'sets') not between 1 and 30 then raise exception 'Use 1–30 sets per exercise' using errcode = '23514'; end if;
    insert into public.routine_exercises(owner_id,routine_id,exercise_id,position,notes)
      values(uid,rid,visible.id,epos,ex->>'notes') returning id into slot;
    spos := 0;
    for s in select value from jsonb_array_elements(ex->'sets') loop
      if s->>'setType' is null or s->>'setType' not in ('warmup','working','drop','failure')
        or (s->>'reps')::numeric not between 1 and 1000 or (s->>'reps')::numeric <> trunc((s->>'reps')::numeric)
        or s->>'reps' is null or char_length(coalesce(s->>'notes','')) > 2000
        or (s->>'weight')::numeric not between 0 and 2000 then raise exception 'Invalid target set' using errcode = '23514'; end if;
      insert into public.routine_sets(owner_id,routine_exercise_id,position,target_reps,target_weight_kg,target_rpe,target_rir,set_type,notes)
        values(uid,slot,spos,(s->>'reps')::integer,(s->>'weight')::numeric,(s->>'rpe')::numeric,(s->>'rir')::integer,s->>'setType',s->>'notes');
      spos := spos+1;
    end loop;
    epos := epos+1;
  end loop;
  return jsonb_build_object('id',rid,'revision',next_revision);
end $$;

create function public.save_strength_workout(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid(); wid uuid := (p_document->>'id')::uuid;
  expected integer := (p_document->>'revision')::integer;
  next_revision integer; ex jsonb; s jsonb; old_ex jsonb; old_slots jsonb := '[]';
  epos integer := 0; spos integer; visible public.exercises%rowtype;
  start_time timestamptz := (p_document->>'startedAt')::timestamptz;
  finish_time timestamptz := (p_document->>'completedAt')::timestamptz;
  tz text := p_document->>'timezone'; original public.workout_sessions%rowtype;
  complete_count integer := 0;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if wid is null or expected is null or expected < 0 or start_time is null
    or start_time > now()+interval '5 minutes' or finish_time > now()+interval '5 minutes'
    or finish_time < start_time or not exists (select 1 from pg_catalog.pg_timezone_names where name=tz)
    or char_length(trim(coalesce(p_document->>'name',''))) not between 1 and 200
    or char_length(coalesce(p_document->>'notes','')) > 5000
    or jsonb_typeof(p_document->'exercises') is distinct from 'array' then raise exception 'Invalid workout' using errcode = '23514'; end if;
  if jsonb_array_length(p_document->'exercises') > 40 then raise exception 'Maximum 40 exercises' using errcode = '23514'; end if;
  if expected = 0 then
    insert into public.workout_sessions(id,owner_id,routine_id,title_snapshot,notes,started_at,completed_at,timezone)
      values(wid,uid,(p_document->>'routineId')::uuid,trim(p_document->>'name'),p_document->>'notes',start_time,finish_time,tz) returning revision into next_revision;
  else
    select * into original from public.workout_sessions where id=wid and owner_id=uid for update;
    if not found or original.revision <> expected then raise exception 'Record changed or unavailable. Reload before saving.' using errcode = '40001'; end if;
    if original.completed_at is not null and finish_time is null then raise exception 'Completed workouts cannot become drafts' using errcode = '23514'; end if;
    select coalesce(jsonb_agg(to_jsonb(se)),'[]') into old_slots from public.session_exercises se where session_id=wid and owner_id=uid;
    update public.workout_sessions set title_snapshot=trim(p_document->>'name'),notes=p_document->>'notes',started_at=start_time,completed_at=finish_time,timezone=tz,revision=revision+1
      where id=wid and owner_id=uid returning revision into next_revision;
    delete from public.session_exercises where session_id=wid and owner_id=uid;
  end if;
  for ex in select value from jsonb_array_elements(p_document->'exercises') loop
    old_ex := null;
    select value into old_ex from jsonb_array_elements(old_slots) where value->>'id'=ex->>'id' and value->>'exercise_id'=ex->>'exerciseId';
    select * into visible from public.exercises where id=(ex->>'exerciseId')::uuid and (owner_id is null or owner_id=uid);
    if not found or visible.tracking_type not in ('reps_weight','reps') or (visible.archived_at is not null and old_ex is null) then raise exception 'Strength exercise unavailable' using errcode = '23514'; end if;
    if jsonb_typeof(ex->'sets') is distinct from 'array' or char_length(coalesce(ex->>'notes','')) > 2000 then raise exception 'Invalid exercise' using errcode = '23514'; end if;
    if jsonb_array_length(ex->'sets') not between 1 and 30 then raise exception 'Use 1–30 sets per exercise' using errcode = '23514'; end if;
    insert into public.session_exercises(id,owner_id,session_id,exercise_id,name_snapshot,tracking_type_snapshot,position,notes)
      values((ex->>'id')::uuid,uid,wid,visible.id,coalesce(old_ex->>'name_snapshot',visible.name),coalesce(old_ex->>'tracking_type_snapshot',visible.tracking_type),epos,ex->>'notes');
    spos := 0;
    for s in select value from jsonb_array_elements(ex->'sets') loop
      if s->>'reps' is null or (s->>'reps')::numeric not between 0 and 1000 or (s->>'reps')::numeric <> trunc((s->>'reps')::numeric)
        or s->>'weight' is null or (s->>'weight')::numeric not between 0 and 2000
        or s->>'setType' is null or s->>'setType' not in ('warmup','working','drop','failure')
        or (s->>'rir')::numeric <> trunc((s->>'rir')::numeric)
        or char_length(coalesce(s->>'notes','')) > 2000 then raise exception 'Invalid workout set' using errcode = '23514'; end if;
      if s->>'completedAt' is not null then
        if (s->>'reps')::integer < 1 or (s->>'completedAt')::timestamptz < start_time or (s->>'completedAt')::timestamptz > coalesce(finish_time,now())+interval '5 minutes' then
          raise exception 'Invalid completed set' using errcode = '23514';
        end if;
        complete_count := complete_count+1;
      end if;
      insert into public.workout_sets(id,owner_id,session_exercise_id,position,reps,weight_kg,rpe,rir,set_type,completed_at,notes)
        values((s->>'id')::uuid,uid,(ex->>'id')::uuid,spos,(s->>'reps')::integer,(s->>'weight')::numeric,(s->>'rpe')::numeric,(s->>'rir')::integer,s->>'setType',(s->>'completedAt')::timestamptz,s->>'notes');
      spos := spos+1;
    end loop;
    epos := epos+1;
  end loop;
  if finish_time is not null and complete_count=0 then raise exception 'Complete at least one set before finishing' using errcode = '23514'; end if;
  -- Future calendar integration can safely pass an owned occurrence on creation.
  if finish_time is not null then
    update public.scheduled_activities set status='completed' where id=original.scheduled_activity_id and owner_id=uid;
  end if;
  return jsonb_build_object('id',wid,'revision',next_revision);
end $$;

create function public.delete_strength_workout(p_id uuid, p_revision integer) returns void
language plpgsql security invoker set search_path = '' as $$
declare original public.workout_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into original from public.workout_sessions where id=p_id and owner_id=auth.uid() and revision=p_revision for update;
  if not found then raise exception 'Record changed or unavailable. Reload before deleting.' using errcode = '40001'; end if;
  delete from public.workout_sessions where id=p_id and owner_id=auth.uid();
  update public.scheduled_activities set status='planned' where id=original.scheduled_activity_id and owner_id=auth.uid() and status='completed';
end $$;

revoke all on function public.save_strength_routine(jsonb) from public, anon;
revoke all on function public.save_strength_workout(jsonb) from public, anon;
revoke all on function public.delete_strength_workout(uuid, integer) from public, anon;
grant execute on function public.save_strength_routine(jsonb) to authenticated;
grant execute on function public.save_strength_workout(jsonb) to authenticated;
grant execute on function public.delete_strength_workout(uuid, integer) to authenticated;

commit;
