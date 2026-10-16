-- Phase 4: private observations, bounded local-date schedules and atomic fulfillment.
begin;
insert into public.health_metrics values ('arm','cm','latest',0,200),('thigh','cm','latest',0,300),('calf','cm','latest',0,200) on conflict do nothing;
-- Steps are a daily total, not additive samples from competing providers.
update public.health_metrics set aggregation='latest' where code='steps';
alter table public.health_observations
  add column revision integer not null default 1 check(revision>0),
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column quality integer check(quality between 1 and 5),
  add column measurement_label text check(length(measurement_label) between 1 and 80),
  add constraint sleep_interval check((started_at is null and ended_at is null) or (metric_code='sleep' and started_at is not null and ended_at>=started_at));
insert into public.health_metrics values ('measurement','cm','latest',0,400) on conflict do nothing;
create or replace function public.validate_health_value() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.health_metrics where code=new.metric_code and new.value between minimum and maximum)
    or not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone)
    or new.local_date<>(new.observed_at at time zone new.timezone)::date
    or length(coalesce(new.notes,''))>5000 or length(new.source) not between 1 and 100
    or (new.metric_code='measurement' and new.measurement_label is null)
    or (new.metric_code<>'sleep' and new.quality is not null)
    or (new.metric_code='steps' and new.value<>trunc(new.value)) then
    raise exception 'Health measurement is outside the accepted range or has invalid date/metadata' using errcode='23514';
  end if;
  if new.started_at is not null and (new.ended_at is null or new.ended_at<>new.observed_at or abs(extract(epoch from (new.ended_at-new.started_at))/60-new.value)>0.001) then
    raise exception 'Sleep interval and duration disagree' using errcode='23514';
  end if;
  if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
  return new;
end $$;
create function public.guard_health_goal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text||new.metric_code,48));
  if new.metric_code not in ('steps','water','sleep','weight') or not exists(select 1 from public.health_metrics where code=new.metric_code and new.target between minimum and maximum)
    or exists(select 1 from public.health_goals where owner_id=new.owner_id and metric_code=new.metric_code and id<>new.id and starts_on<=coalesce(new.ends_on,'infinity') and coalesce(ends_on,'infinity')>=new.starts_on) then
    raise exception 'Invalid or overlapping health goal' using errcode='23514';
  end if;
  return new;
end $$;
create trigger health_goal_guard before insert or update on public.health_goals for each row execute function public.guard_health_goal();
create function public.set_health_goal(p_metric text,p_date date,p_target numeric) returns void language plpgsql security invoker set search_path='' as $$
declare next_date date;
begin
  if auth.uid() is null or p_date is null or p_target is null then raise exception 'Authentication and goal required' using errcode='23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_metric,48));
  update public.health_goals set target=p_target where owner_id=auth.uid() and metric_code=p_metric and starts_on=p_date;
  if found then return; end if;
  select min(starts_on) into next_date from public.health_goals where owner_id=auth.uid() and metric_code=p_metric and starts_on>p_date;
  update public.health_goals set ends_on=p_date-1 where owner_id=auth.uid() and metric_code=p_metric and starts_on<p_date and (ends_on is null or ends_on>=p_date);
  insert into public.health_goals(owner_id,metric_code,target,starts_on,ends_on) values(auth.uid(),p_metric,p_target,p_date,next_date-1);
end $$;

alter table public.schedule_rules
  add column weekdays integer[] not null default '{}',
  add column local_time time not null default '12:00',
  add column occurrence_limit integer not null default 84 check(occurrence_limit between 1 and 366),
  add column retired_at timestamptz;
alter table public.scheduled_activities
  add column revision integer not null default 1 check(revision>0),
  add column is_exception boolean not null default false,
  add column notes text not null default '' check(length(notes)<=5000);
create function public.guard_schedule() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone' using errcode='23514'; end if;
  if tg_op='INSERT' then
    new.template_snapshot:=public.schedule_template(new.kind,coalesce(new.routine_id,new.recipe_id));
    new.title:=new.template_snapshot->>'name';
    if new.status<>'planned' then raise exception 'New schedules must be planned' using errcode='23514'; end if;
  end if;
  if new.status='completed' and not exists(select 1 from public.workout_sessions where scheduled_activity_id=new.id and completed_at is not null) and not exists(select 1 from public.nutrition_entries where scheduled_activity_id=new.id) then raise exception 'Completion requires a recorded activity' using errcode='23514'; end if;
  if tg_op='UPDATE' then
    if new.kind<>old.kind or new.routine_id is distinct from old.routine_id or new.recipe_id is distinct from old.recipe_id or new.rule_id is distinct from old.rule_id or new.occurrence_date is distinct from old.occurrence_date or new.template_snapshot<>old.template_snapshot then
      raise exception 'Schedule lineage and snapshots are immutable' using errcode='23514'; end if;
    if exists(select 1 from public.workout_sessions where scheduled_activity_id=old.id) or exists(select 1 from public.nutrition_entries where scheduled_activity_id=old.id) then
      if new.scheduled_at<>old.scheduled_at or new.status<>'completed' and (exists(select 1 from public.workout_sessions where scheduled_activity_id=old.id and completed_at is not null) or exists(select 1 from public.nutrition_entries where scheduled_activity_id=old.id)) then raise exception 'Recorded activities cannot be rescheduled or cancelled' using errcode='23514'; end if;
    end if;
    new.revision:=old.revision+1;
  end if;
  return new;
end $$;
create trigger schedule_guard before insert or update on public.scheduled_activities for each row execute function public.guard_schedule();

-- Template snapshots are derived from readable relational records, never browser totals.
create function public.schedule_template(p_kind text,p_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if p_kind='meal' then return public.recipe_nutrition_basis(p_id); end if;
  if p_kind<>'workout' then raise exception 'Invalid schedule kind' using errcode='23514'; end if;
  select jsonb_build_object('id',r.id,'revision',r.revision,'name',r.name,'notes',coalesce(r.notes,''),'exercises',coalesce((
    select jsonb_agg(jsonb_build_object('id',e.id,'exerciseId',e.exercise_id,'name',c.name,'trackingType',c.tracking_type,'notes',coalesce(e.notes,''),'sets',(
      select jsonb_agg(jsonb_build_object('id',s.id,'reps',s.target_reps,'weight',s.target_weight_kg,'rpe',s.target_rpe,'rir',s.target_rir,'setType',s.set_type,'notes',coalesce(s.notes,''),'completedAt',null) order by s.position) from public.routine_sets s where s.routine_exercise_id=e.id
    )) order by e.position) from public.routine_exercises e join public.exercises c on c.id=e.exercise_id where e.routine_id=r.id
  ),'[]')) into result from public.routines r where r.id=p_id and r.owner_id=auth.uid() and r.archived_at is null;
  if result is null then raise exception 'Template unavailable' using errcode='23514'; end if;
  return result;
end $$;
create function public.create_schedule(p_document jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid:=(p_document->>'id')::uuid; template uuid:=(p_document->>'templateId')::uuid;
  kind text:=p_document->>'kind'; tz text:=p_document->>'timezone'; first_date date:=(p_document->>'start')::date;
  last_date date:=(p_document->>'end')::date; clock time:=(p_document->>'time')::time; weekdays integer[];
  max_count integer:=(p_document->>'count')::integer; d date; instant timestamptz; n integer:=0; snapshot jsonb; recurring boolean:=coalesce((p_document->>'recurring')::boolean,false);
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if rid is null or first_date is null or clock is null or max_count is null or max_count not between 1 and 366 or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'Invalid schedule' using errcode='23514'; end if;
  last_date:=coalesce(last_date,first_date+365);
  if last_date<first_date or last_date>first_date+365 then raise exception 'Use at most one year per series' using errcode='23514'; end if;
  select array_agg(value::integer) into weekdays from jsonb_array_elements_text(p_document->'weekdays');
  if recurring and (coalesce(cardinality(weekdays),0)=0 or not weekdays<@array[0,1,2,3,4,5,6]) then raise exception 'Choose weekdays' using errcode='23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(rid::text,49));
  if exists(select 1 from public.schedule_rules where id=rid and owner_id=uid) or exists(select 1 from public.scheduled_activities where id=rid and owner_id=uid) then return rid; end if;
  snapshot:=public.schedule_template(kind,template);
  if recurring then
    insert into public.schedule_rules(id,owner_id,kind,routine_id,recipe_id,timezone,starts_on,ends_on,recurrence_rule,weekdays,local_time,occurrence_limit)
    values(rid,uid,kind,case when kind='workout' then template end,case when kind='meal' then template end,tz,first_date,last_date,'FREQ=WEEKLY',weekdays,clock,max_count);
  end if;
  for d in select first_date+i from generate_series(0,last_date-first_date) i loop
    if not recurring and d<>first_date then exit; end if;
    if recurring and not extract(dow from d)::integer=any(weekdays) then continue; end if;
    instant:=(d+clock) at time zone tz;
    if (instant at time zone tz)<>(d+clock) then raise exception 'A scheduled local time does not exist due to daylight saving; choose another time' using errcode='23514'; end if;
    insert into public.scheduled_activities(id,owner_id,kind,title,scheduled_at,timezone,routine_id,recipe_id,rule_id,occurrence_date,template_snapshot)
    values(case when recurring then gen_random_uuid() else rid end,uid,kind,snapshot->>'name',instant,tz,case when kind='workout' then template end,case when kind='meal' then template end,case when recurring then rid end,case when recurring then d end,snapshot);
    n:=n+1; if n>=max_count then exit; end if;
  end loop;
  if n=0 then raise exception 'No occurrences in this range' using errcode='23514'; end if;
  return rid;
end $$;
create function public.edit_schedule(p_id uuid,p_revision integer,p_date date,p_time time,p_status text,p_title text,p_notes text,p_future boolean) returns void language plpgsql security invoker set search_path='' as $$
declare a public.scheduled_activities%rowtype; item public.scheduled_activities%rowtype; instant timestamptz; delta integer;
begin
  select * into a from public.scheduled_activities where id=p_id and owner_id=auth.uid() for update;
  if not found or a.revision<>p_revision then raise exception 'Schedule changed or unavailable' using errcode='PT409'; end if;
  if p_status not in ('planned','cancelled','skipped') or length(trim(p_title)) not between 1 and 200 or p_date is null or p_time is null then raise exception 'Invalid schedule edit' using errcode='23514'; end if;
  delta:=p_date-(a.scheduled_at at time zone a.timezone)::date;
  -- Serialize series edits and preserve every completed/draft-linked occurrence.
  if a.rule_id is not null then perform 1 from public.schedule_rules where id=a.rule_id for update; end if;
  for item in select * from public.scheduled_activities where owner_id=auth.uid() and (id=a.id or (p_future and a.rule_id is not null and rule_id=a.rule_id and occurrence_date>=a.occurrence_date and not is_exception)) and status<>'completed' and not exists(select 1 from public.workout_sessions w where w.scheduled_activity_id=scheduled_activities.id) order by scheduled_at for update loop
    instant:=(((item.scheduled_at at time zone item.timezone)::date+delta)+p_time) at time zone item.timezone;
    if (instant at time zone item.timezone)::time<>p_time then raise exception 'Local time does not exist' using errcode='23514'; end if;
    update public.scheduled_activities set scheduled_at=instant,status=p_status,title=trim(p_title),notes=p_notes,is_exception=not p_future where id=item.id;
  end loop;
  if p_future and a.rule_id is not null and p_status='cancelled' then update public.schedule_rules set retired_at=now() where id=a.rule_id; end if;
end $$;

create function public.start_scheduled_workout(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.scheduled_activities%rowtype; doc jsonb; result jsonb; existing uuid;
begin
  select * into a from public.scheduled_activities where id=p_id and owner_id=auth.uid() and kind='workout' for update;
  if not found or a.status in ('cancelled','skipped') then raise exception 'Workout unavailable' using errcode='23514'; end if;
  select id into existing from public.workout_sessions where scheduled_activity_id=p_id;
  if found then return jsonb_build_object('id',existing); end if;
  doc:=a.template_snapshot||jsonb_build_object('id',gen_random_uuid(),'revision',0,'routineId',a.routine_id,'startedAt',now(),'completedAt',null,'timezone',a.timezone);
  -- Re-key snapshot slots/sets so simultaneous sessions never share row IDs.
  select doc||jsonb_build_object('exercises',coalesce(jsonb_agg(ex||jsonb_build_object('id',gen_random_uuid(),'sets',(select jsonb_agg(s||jsonb_build_object('id',gen_random_uuid(),'weight',coalesce((s->>'weight')::numeric,0))) from jsonb_array_elements(ex->'sets') s))),'[]')) into doc from jsonb_array_elements(doc->'exercises') ex;
  result:=public.save_strength_workout(doc);
  update public.workout_sessions set scheduled_activity_id=p_id where id=(result->>'id')::uuid;
  return result;
end $$;

-- Consumption uses the planned immutable recipe basis. Reuse the existing trigger
-- for all conversion/null/history rules, with only its recipe-basis selection changed.
do $$ declare definition text; begin
  select pg_get_functiondef('public.snapshot_nutrition_entry()'::regprocedure) into definition;
  definition:=replace(definition,'elsif new.recipe_id is not null then b:=public.recipe_nutrition_basis(new.recipe_id);',
    'elsif new.scheduled_activity_id is not null then
      select template_snapshot into b from public.scheduled_activities where id=new.scheduled_activity_id and owner_id=auth.uid() and kind=''meal'' and recipe_id=new.recipe_id and status=''planned'';
      if b is null then raise exception ''Planned meal unavailable'' using errcode=''23514''; end if;
    elsif new.recipe_id is not null then b:=public.recipe_nutrition_basis(new.recipe_id);');
  execute definition;
end $$;
create unique index nutrition_one_schedule on public.nutrition_entries(scheduled_activity_id) where scheduled_activity_id is not null;
create function public.consume_scheduled_meal(p_id uuid,p_entry uuid,p_quantity numeric,p_date date) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.scheduled_activities%rowtype; existing uuid;
begin
  select * into a from public.scheduled_activities where id=p_id and owner_id=auth.uid() and kind='meal' for update;
  if not found then raise exception 'Meal unavailable' using errcode='23514'; end if;
  select id into existing from public.nutrition_entries where scheduled_activity_id=p_id;
  if found then return existing; end if;
  if a.status<>'planned' or p_date is null then raise exception 'Meal is not planned' using errcode='23514'; end if;
  insert into public.nutrition_entries(id,owner_id,recipe_id,scheduled_activity_id,logged_at,local_date,timezone,meal_slot,name_snapshot,quantity,unit_snapshot)
  values(p_entry,auth.uid(),a.recipe_id,p_id,(p_date+time '12:00') at time zone a.timezone,p_date,a.timezone,'other',a.title,p_quantity,'serving');
  update public.scheduled_activities set status='completed' where id=p_id;
  return p_entry;
end $$;
create function public.sync_meal_schedule() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.scheduled_activity_id is not null then update public.scheduled_activities set status='planned' where id=old.scheduled_activity_id and owner_id=auth.uid(); end if;
  return old;
end $$;
create trigger meal_schedule_deleted after delete on public.nutrition_entries for each row execute function public.sync_meal_schedule();
create function public.guard_diary_schedule_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.scheduled_activity_id is distinct from old.scheduled_activity_id then raise exception 'Diary schedule links cannot be reassigned' using errcode='23514'; end if;
  return new;
end $$;
create trigger nutrition_schedule_link before update on public.nutrition_entries for each row execute function public.guard_diary_schedule_link();
revoke all on function public.guard_diary_schedule_link() from public,anon,authenticated;
create function public.retire_schedule(p_rule uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.schedule_rules where id=p_rule and owner_id=auth.uid() for update;
  if not found then raise exception 'Series unavailable' using errcode='23514'; end if;
  update public.scheduled_activities a set status='cancelled',is_exception=true where rule_id=p_rule and owner_id=auth.uid() and status<>'completed'
    and not exists(select 1 from public.workout_sessions w where w.scheduled_activity_id=a.id)
    and not exists(select 1 from public.nutrition_entries n where n.scheduled_activity_id=a.id);
  update public.schedule_rules set retired_at=now() where id=p_rule and owner_id=auth.uid();
end $$;
revoke all on function public.retire_schedule(uuid) from public,anon;
grant execute on function public.retire_schedule(uuid) to authenticated;
revoke all on function public.guard_health_goal(), public.guard_schedule(), public.sync_meal_schedule() from public,anon,authenticated;
revoke all on function public.set_health_goal(text,date,numeric),public.schedule_template(text,uuid),public.create_schedule(jsonb),public.edit_schedule(uuid,integer,date,time,text,text,text,boolean),public.start_scheduled_workout(uuid),public.consume_scheduled_meal(uuid,uuid,numeric,date) from public,anon;
grant execute on function public.set_health_goal(text,date,numeric),public.schedule_template(text,uuid),public.create_schedule(jsonb),public.edit_schedule(uuid,integer,date,time,text,text,text,boolean),public.start_scheduled_workout(uuid),public.consume_scheduled_meal(uuid,uuid,numeric,date) to authenticated;
commit;
