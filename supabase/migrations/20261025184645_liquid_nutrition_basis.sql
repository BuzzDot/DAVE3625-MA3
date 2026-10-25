-- Explicit volume basis; no density assumptions and no rewrites of historical entries.
begin;
-- Abort cleanly instead of waiting behind a busy production transaction.
set local lock_timeout = '5s';
set local statement_timeout = '60s';
alter table public.foods add column nutrition_basis text not null default 'g' check (nutrition_basis in ('g','ml'));
-- Keep legacy macro column names for API compatibility. nutrition_basis supplies
-- their denominator (100 g or 100 ml); existing rows remain per 100 g.
comment on column public.foods.nutrition_basis is 'Denominator for legacy *_per_100g values: per 100 g or per 100 ml. Immutable after creation.';
alter table public.nutrition_entries add column ml_snapshot numeric(10,3)
  check (ml_snapshot is null or (ml_snapshot>0 and grams_snapshot is null));
create or replace function public.guard_food_definition() returns trigger language plpgsql security invoker set search_path='' as $$
declare p jsonb; n jsonb;
begin
  if new.owner_id is not null and (new.source<>'manual' or new.external_id is not null or new.source_url is not null or new.imported_at is not null) then
    raise exception 'Personal foods cannot claim trusted external provenance' using errcode='23514';
  end if;
  if new.kcal_per_100g>2000 or length(new.search_keywords)>4000 then raise exception 'Invalid food values' using errcode='23514'; end if;
  if tg_op='UPDATE' and new.nutrition_basis<>old.nutrition_basis then raise exception 'Nutrition basis is immutable; create a new food' using errcode='23514'; end if;
  for p in select value from jsonb_array_elements(new.portions) loop
    if jsonb_typeof(p)<>'object' or coalesce(length(p->>'id'),0) not between 1 and 80 or p->>'id'='g'
      or coalesce(length(p->>'label'),0) not between 1 and 100
      or (new.nutrition_basis='ml' and (p ? 'grams' or p->>'id'='ml')) or (new.nutrition_basis='g' and p ? 'ml')
      or (p->>(case when new.nutrition_basis='ml' then 'ml' else 'grams' end))::numeric is null
      or not ((p->>(case when new.nutrition_basis='ml' then 'ml' else 'grams' end))::numeric>0 and (p->>(case when new.nutrition_basis='ml' then 'ml' else 'grams' end))::numeric<=100000) then
      raise exception 'Invalid serving conversion' using errcode='23514';
    end if;
  end loop;
  if (select count(*) from jsonb_array_elements(new.portions))<>(select count(distinct value->>'id') from jsonb_array_elements(new.portions)) then
    raise exception 'Serving identifiers must be unique' using errcode='23514';
  end if;
  for n in select value from jsonb_each(new.nutrients) loop
    if jsonb_typeof(n)<>'object' or coalesce(length(n->>'unit'),0) not between 1 and 20 or (n->'amount' is not null and jsonb_typeof(n->'amount') not in ('number','null')) then
      raise exception 'Invalid additional nutrient' using errcode='23514';
    end if;
    if (n->>'amount')::numeric<0 or (n->>'amount')::numeric>1000000 then raise exception 'Invalid additional nutrient amount' using errcode='23514'; end if;
  end loop;
  if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
  return new;
end $$;

create or replace function public.snapshot_nutrition_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare f public.foods%rowtype; b jsonb; conversion numeric; grams numeric; extra jsonb; basis_unit text;
begin
  if new.owner_id<>auth.uid() then raise exception 'Ownership required' using errcode='42501'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) or new.local_date<>(new.logged_at at time zone new.timezone)::date then
    raise exception 'Nutrition date and timezone do not agree' using errcode='23514';
  end if;
  if new.quantity>100000 then raise exception 'Quantity is too large' using errcode='23514'; end if;
  if tg_op='UPDATE' then
    if new.food_id is distinct from old.food_id or new.recipe_id is distinct from old.recipe_id or new.owner_id<>old.owner_id then
      raise exception 'Replace an entry by logging a new item' using errcode='23514';
    end if;
    b:=old.basis_snapshot;
    if b is null then
      -- Legacy records have trusted totals but no catalog basis: preserve them.
      if new.quantity<>old.quantity or new.unit_snapshot<>old.unit_snapshot then raise exception 'Legacy quantity cannot be recalculated' using errcode='23514'; end if;
      new.kcal_snapshot:=old.kcal_snapshot;new.protein_snapshot:=old.protein_snapshot;new.carbs_snapshot:=old.carbs_snapshot;new.fat_snapshot:=old.fat_snapshot;
      new.name_snapshot:=old.name_snapshot;new.grams_snapshot:=old.grams_snapshot;new.nutrients_snapshot:=old.nutrients_snapshot;
      new.ml_snapshot:=old.ml_snapshot;new.basis_snapshot:=old.basis_snapshot;new.source:=old.source;new.external_id:=old.external_id;new.verified_at:=old.verified_at;
      new.revision:=old.revision+1; return new;
    end if;
  elsif new.food_id is not null then
    select * into f from public.foods where id=new.food_id and archived_at is null and (owner_id is null or owner_id=new.owner_id);
    if not found then raise exception 'Food is unavailable' using errcode='23514'; end if;
    b:=jsonb_build_object('basisUnit',f.nutrition_basis,'name',f.name,'kcal',f.kcal_per_100g,'protein',f.protein_per_100g,'carbs',f.carbs_per_100g,'fat',f.fat_per_100g,'portions',f.portions,'nutrients',f.nutrients,'source',f.source,'externalId',f.external_id,'sourceUrl',f.source_url,'foodRevision',f.revision);
  elsif new.scheduled_activity_id is not null then
    -- Preserve migration 008's planned immutable recipe basis, not today's catalog.
    select template_snapshot into b from public.scheduled_activities where id=new.scheduled_activity_id and owner_id=auth.uid() and kind='meal' and recipe_id=new.recipe_id and status='planned';
    if b is null then raise exception 'Planned meal unavailable' using errcode='23514'; end if;
  elsif new.recipe_id is not null then b:=public.recipe_nutrition_basis(new.recipe_id);
  else raise exception 'Select a food or recipe' using errcode='23514';
  end if;
  basis_unit:=coalesce(b->>'basisUnit','g');
  if new.unit_snapshot=basis_unit then conversion:=1;
  else select (value->>(case when basis_unit='ml' then 'ml' else 'grams' end))::numeric into conversion from jsonb_array_elements(b->'portions') where value->>'id'=new.unit_snapshot;
  end if;
  if conversion is null then raise exception 'Serving is unavailable' using errcode='23514'; end if;
  grams:=new.quantity*conversion;
  if grams>1000000 then raise exception 'Consumed amount is too large' using errcode='23514'; end if;
  new.name_snapshot:=b->>'name';new.basis_snapshot:=b;
  new.grams_snapshot:=case when basis_unit='g' then grams end;
  new.ml_snapshot:=case when basis_unit='ml' then grams end;
  new.kcal_snapshot:=(b->>'kcal')::numeric*grams/100;new.protein_snapshot:=(b->>'protein')::numeric*grams/100;
  new.carbs_snapshot:=(b->>'carbs')::numeric*grams/100;new.fat_snapshot:=(b->>'fat')::numeric*grams/100;
  select coalesce(jsonb_object_agg(key,jsonb_build_object('amount',(value->>'amount')::numeric*grams/100,'unit',value->>'unit')),'{}') into extra from jsonb_each(coalesce(b->'nutrients','{}'));
  new.nutrients_snapshot:=extra;
  if tg_op='INSERT' then new.source:='manual';new.external_id:=null;new.verified_at:=null;
  else new.source:=old.source;new.external_id:=old.external_id;new.verified_at:=old.verified_at;new.revision:=old.revision+1;
  end if;
  return new;
end $$;

-- Recipes still declare ingredient weights. Deny volume-only foods on every
-- insert/update path, including direct Data API writes, not just the UI/RPC.
create function public.guard_recipe_food_basis() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.foods where id=new.food_id and nutrition_basis='g' and (owner_id is null or owner_id=new.owner_id)) then
    raise exception 'Recipes need a food with verified gram-based nutrition' using errcode='23514';
  end if;
  return new;
end $$;
create trigger recipe_food_basis before insert or update on public.recipe_ingredients for each row execute function public.guard_recipe_food_basis();
revoke all on function public.guard_recipe_food_basis() from public,anon,authenticated;
-- Existing invoker-security functions retain their privileges and RLS. No new RPC.
notify pgrst, 'reload schema';
commit;
