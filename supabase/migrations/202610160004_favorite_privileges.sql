-- Supabase default privileges can grant ALL to anon/authenticated on new tables.
-- Explicitly replace those defaults; RLS alone does not restrict TRUNCATE.
begin;
revoke all on public.exercise_favorites from anon, authenticated;
grant select, insert, delete on public.exercise_favorites to authenticated;

-- Defense in depth for trusted maintenance updates as well as client inserts.
drop trigger exercise_favorite_reference on public.exercise_favorites;
create trigger exercise_favorite_reference before insert or update on public.exercise_favorites
  for each row execute function public.guard_exercise_favorite();
commit;
