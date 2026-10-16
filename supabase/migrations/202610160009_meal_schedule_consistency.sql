-- Keep scheduled meal lineage/status consistent for ordinary RLS writes as well as RPCs.
begin;
create function public.validate_meal_schedule_reference() returns trigger language plpgsql security invoker set search_path='' as $$
declare activity public.scheduled_activities%rowtype;
begin
  if new.scheduled_activity_id is not null then
    select * into activity from public.scheduled_activities where id=new.scheduled_activity_id and owner_id=auth.uid() and kind='meal' for update;
    if not found or activity.status<>'planned' or new.food_id is not null or new.recipe_id is distinct from activity.recipe_id then
      raise exception 'Select the planned recipe for this occurrence' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger nutrition_schedule_reference before insert on public.nutrition_entries for each row execute function public.validate_meal_schedule_reference();
create function public.mark_meal_schedule_recorded() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.scheduled_activity_id is not null then update public.scheduled_activities set status='completed' where id=new.scheduled_activity_id and owner_id=auth.uid(); end if;
  return new;
end $$;
create trigger meal_schedule_recorded after insert on public.nutrition_entries for each row execute function public.mark_meal_schedule_recorded();
revoke all on function public.validate_meal_schedule_reference(),public.mark_meal_schedule_recorded() from public,anon,authenticated;
-- Match the existing logger's action/browser clock rather than mixing a remote
-- database clock into a session that can be completed immediately after opening.
create function public.start_scheduled_workout_at(p_id uuid,p_started_at timestamptz) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; existing uuid;
begin
  if auth.uid() is null or p_started_at is null or p_started_at<now()-interval '5 minutes' or p_started_at>now()+interval '5 minutes' then raise exception 'Invalid start instant' using errcode='23514'; end if;
  perform 1 from public.scheduled_activities where id=p_id and owner_id=auth.uid() and kind='workout' for update;
  if not found then raise exception 'Workout unavailable' using errcode='23514'; end if;
  select id into existing from public.workout_sessions where scheduled_activity_id=p_id;
  if found then return jsonb_build_object('id',existing); end if;
  result:=public.start_scheduled_workout(p_id);
  update public.workout_sessions set started_at=p_started_at where id=(result->>'id')::uuid and owner_id=auth.uid();
  return result;
end $$;
revoke all on function public.start_scheduled_workout_at(uuid,timestamptz) from public,anon;
grant execute on function public.start_scheduled_workout_at(uuid,timestamptz) to authenticated;
commit;
