begin;

-- Fail closed: every application table has RLS and explicit privileges.
revoke all on all tables in schema public from anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['programs','program_versions','program_items','routines','routine_exercises','routine_sets','recipes','recipe_ingredients','food_favorites','program_favorites','schedule_rules','scheduled_activities','workout_sessions','session_exercises','workout_sets','nutrition_entries','nutrition_goals','health_observations','health_goals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;
create policy own_profile on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$ declare t text; begin
  foreach t in array array['exercises','foods'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy readable_catalog on public.%I for select to anon, authenticated using (owner_id is null or owner_id = (select auth.uid()))', t);
    execute format('create policy own_catalog_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
    execute format('create policy own_catalog_update on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
    execute format('create policy own_catalog_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.health_metrics enable row level security;
grant select on public.health_metrics to anon, authenticated;
create policy read_metric_definitions on public.health_metrics for select to anon, authenticated using (true);

-- Integration lifecycle is controlled by trusted server jobs, never client writes.
do $$ declare t text; begin
  foreach t in array array['integration_connections','import_jobs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy owner_read on public.%I for select to authenticated using (owner_id = (select auth.uid()))', t);
  end loop;
end $$;

grant select on public.program_versions, public.program_items to anon;
create policy published_version_read on public.program_versions for select to anon, authenticated
  using (visibility = 'public' and published_at is not null);
create policy published_item_read on public.program_items for select to anon, authenticated
  using (exists (select 1 from public.program_versions v where v.id = program_version_id and v.visibility = 'public' and v.published_at is not null));

-- FK constraints enforce existence, not visibility. Guard shared references too.
create function public.guard_shared_references() returns trigger language plpgsql set search_path = '' as $$
declare ref uuid;
begin
  if tg_table_name in ('routine_exercises','session_exercises') then
    if not exists (select 1 from public.exercises e where e.id = new.exercise_id and (e.owner_id is null or e.owner_id = new.owner_id)) then
      raise exception 'Exercise is unavailable' using errcode = '23514';
    end if;
  end if;
  if tg_table_name in ('recipe_ingredients','food_favorites','nutrition_entries') then
    if new.food_id is not null and not exists (select 1 from public.foods f where f.id = new.food_id and (f.owner_id is null or f.owner_id = new.owner_id)) then
      raise exception 'Food is unavailable' using errcode = '23514';
    end if;
  end if;
  if tg_table_name in ('routines','recipes','scheduled_activities') then ref := new.source_version_id;
  elsif tg_table_name = 'program_favorites' then ref := new.program_version_id;
  end if;
  if ref is not null and not exists (select 1 from public.program_versions v where v.id = ref and (v.owner_id = new.owner_id or (v.visibility = 'public' and v.published_at is not null))) then
    raise exception 'Program version is unavailable' using errcode = '23514';
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['routine_exercises','session_exercises','recipe_ingredients','food_favorites','nutrition_entries','routines','recipes','scheduled_activities','program_favorites'] loop
    execute format('create trigger guard_shared_references before insert or update on public.%I for each row execute function public.guard_shared_references()', t);
  end loop;
end $$;

-- Published content is immutable; new edits must create a new numbered version.
create function public.guard_published_version() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null then raise exception 'Published versions are immutable' using errcode = '23514'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger immutable_published_version before update or delete on public.program_versions
  for each row execute function public.guard_published_version();

create function public.guard_published_item() returns trigger language plpgsql set search_path = '' as $$
declare old_version uuid; new_version uuid;
begin
  if tg_op <> 'INSERT' then old_version := old.program_version_id; end if;
  if tg_op <> 'DELETE' then new_version := new.program_version_id; end if;
  -- Row lock serializes publication and draft-item edits in concurrent transactions.
  perform 1 from public.program_versions where id in (old_version,new_version) order by id for update;
  if exists (select 1 from public.program_versions where id in (old_version,new_version) and published_at is not null) then
    raise exception 'Published program items are immutable' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger immutable_published_item before insert or update or delete on public.program_items
  for each row execute function public.guard_published_item();

create function public.validate_health_value() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.health_metrics m where m.code = new.metric_code and new.value between m.minimum and m.maximum) then
    raise exception 'Health measurement is outside the accepted range' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger health_value_range before insert or update on public.health_observations
  for each row execute function public.validate_health_value();

-- All functions are invoker-security; no privileged public RPC surface.
revoke execute on function public.guard_shared_references() from public, anon, authenticated;
revoke execute on function public.guard_published_version() from public, anon, authenticated;
revoke execute on function public.guard_published_item() from public, anon, authenticated;
revoke execute on function public.validate_health_value() from public, anon, authenticated;

commit;
