-- Nutrition catalog, immutable consumption basis, reusable recipes and dated goals.
begin;
alter table public.foods
  alter column kcal_per_100g drop not null,
  alter column protein_per_100g drop not null,
  alter column carbs_per_100g drop not null,
  alter column fat_per_100g drop not null,
  add column description text not null default '' check (length(description)<=2000),
  add column portions jsonb not null default '[]' check (jsonb_typeof(portions)='array' and jsonb_array_length(portions)<=30),
  add column nutrients jsonb not null default '{}' check (jsonb_typeof(nutrients)='object'),
  add column search_keywords text not null default '',
  add column source_url text,
  add column imported_at timestamptz,
  add column revision integer not null default 1 check (revision>0);
alter table public.recipes add column revision integer not null default 1 check (revision>0);
alter table public.nutrition_entries
  alter column kcal_snapshot drop not null,
  alter column protein_snapshot drop not null,
  alter column carbs_snapshot drop not null,
  alter column fat_snapshot drop not null,
  add column basis_snapshot jsonb,
  add column nutrients_snapshot jsonb not null default '{}',
  add column revision integer not null default 1 check (revision>0);
create table public.recipe_favorites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,recipe_id),
  foreign key(recipe_id,owner_id) references public.recipes(id,owner_id) on delete cascade
);
alter table public.recipe_favorites enable row level security;
revoke all on public.recipe_favorites from anon,authenticated;
grant select,insert,delete on public.recipe_favorites to authenticated;
create policy owner_access on public.recipe_favorites for all to authenticated
  using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

create function public.guard_food_definition() returns trigger language plpgsql security invoker set search_path='' as $$
declare p jsonb; n jsonb;
begin
  if new.owner_id is not null and (new.source<>'manual' or new.external_id is not null or new.source_url is not null or new.imported_at is not null) then
    raise exception 'Personal foods cannot claim trusted external provenance' using errcode='23514';
  end if;
  if new.kcal_per_100g>2000 or length(new.search_keywords)>4000 then raise exception 'Invalid food values' using errcode='23514'; end if;
  for p in select value from jsonb_array_elements(new.portions) loop
    if jsonb_typeof(p)<>'object' or coalesce(length(p->>'id'),0) not between 1 and 80 or p->>'id'='g'
      or coalesce(length(p->>'label'),0) not between 1 and 100
      or (p->>'grams')::numeric is null or not ((p->>'grams')::numeric>0 and (p->>'grams')::numeric<=100000) then
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
create trigger food_definition before insert or update on public.foods for each row execute function public.guard_food_definition();

-- Readable current recipe composition. Null propagates per nutrient, never zero-fills.
create function public.recipe_nutrition_basis(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare r public.recipes%rowtype; result jsonb; extras jsonb;
begin
  select * into r from public.recipes where id=p_id and owner_id=auth.uid() and archived_at is null;
  if not found then raise exception 'Recipe is unavailable' using errcode='23514'; end if;
  select jsonb_build_object(
    'name',r.name,'grams',sum(i.grams),'servingGrams',sum(i.grams)/r.servings,
    'kcal',case when count(f.kcal_per_100g)=count(*) then sum(f.kcal_per_100g*i.grams)/sum(i.grams) end,
    'protein',case when count(f.protein_per_100g)=count(*) then sum(f.protein_per_100g*i.grams)/sum(i.grams) end,
    'carbs',case when count(f.carbs_per_100g)=count(*) then sum(f.carbs_per_100g*i.grams)/sum(i.grams) end,
    'fat',case when count(f.fat_per_100g)=count(*) then sum(f.fat_per_100g*i.grams)/sum(i.grams) end,
    'portions',jsonb_build_array(jsonb_build_object('id','serving','label','serving','grams',sum(i.grams)/r.servings)),
    'ingredients',jsonb_agg(jsonb_build_object('foodId',f.id,'name',f.name,'grams',i.grams,'source',f.source,'externalId',f.external_id,'revision',f.revision,'kcal',f.kcal_per_100g,'protein',f.protein_per_100g,'carbs',f.carbs_per_100g,'fat',f.fat_per_100g,'nutrients',f.nutrients) order by i.position)
  ) into result from public.recipe_ingredients i join public.foods f on f.id=i.food_id where i.recipe_id=p_id and i.owner_id=auth.uid();
  if result->>'grams' is null then raise exception 'Recipe needs ingredients' using errcode='23514'; end if;
  select coalesce(jsonb_object_agg(key,value),'{}') into extras from (
    select n.key,jsonb_build_object('amount',case when count(distinct n.value->>'unit')=1 and count((n.value->>'amount')::numeric)=(select count(*) from public.recipe_ingredients where recipe_id=p_id and owner_id=auth.uid()) then sum((n.value->>'amount')::numeric*i.grams)/(result->>'grams')::numeric end,'unit',case when count(distinct n.value->>'unit')=1 then min(n.value->>'unit') else 'mixed' end) as value
    from public.recipe_ingredients i join public.foods f on f.id=i.food_id cross join lateral jsonb_each(f.nutrients) n where i.recipe_id=p_id and i.owner_id=auth.uid() group by n.key
  ) totals;
  return result||jsonb_build_object('nutrients',extras,'source','recipe','recipeRevision',r.revision);
end $$;

create function public.snapshot_nutrition_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare f public.foods%rowtype; b jsonb; conversion numeric; grams numeric; extra jsonb;
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
      new.revision:=old.revision+1; return new;
    end if;
  elsif new.food_id is not null then
    select * into f from public.foods where id=new.food_id and archived_at is null and (owner_id is null or owner_id=new.owner_id);
    if not found then raise exception 'Food is unavailable' using errcode='23514'; end if;
    b:=jsonb_build_object('name',f.name,'kcal',f.kcal_per_100g,'protein',f.protein_per_100g,'carbs',f.carbs_per_100g,'fat',f.fat_per_100g,'portions',f.portions,'nutrients',f.nutrients,'source',f.source,'externalId',f.external_id,'sourceUrl',f.source_url,'foodRevision',f.revision);
  elsif new.recipe_id is not null then b:=public.recipe_nutrition_basis(new.recipe_id);
  else raise exception 'Select a food or recipe' using errcode='23514';
  end if;
  if new.unit_snapshot='g' then conversion:=1;
  else select (value->>'grams')::numeric into conversion from jsonb_array_elements(b->'portions') where value->>'id'=new.unit_snapshot;
  end if;
  if conversion is null then raise exception 'Serving is unavailable' using errcode='23514'; end if;
  grams:=new.quantity*conversion;
  if grams>1000000 then raise exception 'Consumed weight is too large' using errcode='23514'; end if;
  new.name_snapshot:=b->>'name';new.grams_snapshot:=grams;new.basis_snapshot:=b;
  new.kcal_snapshot:=(b->>'kcal')::numeric*grams/100;new.protein_snapshot:=(b->>'protein')::numeric*grams/100;
  new.carbs_snapshot:=(b->>'carbs')::numeric*grams/100;new.fat_snapshot:=(b->>'fat')::numeric*grams/100;
  select coalesce(jsonb_object_agg(key,jsonb_build_object('amount',(value->>'amount')::numeric*grams/100,'unit',value->>'unit')),'{}') into extra from jsonb_each(coalesce(b->'nutrients','{}'));
  new.nutrients_snapshot:=extra;
  if tg_op='INSERT' then new.source:='manual';new.external_id:=null;new.verified_at:=null;
  else new.source:=old.source;new.external_id:=old.external_id;new.verified_at:=old.verified_at;new.revision:=old.revision+1;
  end if;
  return new;
end $$;
create trigger nutrition_snapshot before insert or update on public.nutrition_entries for each row execute function public.snapshot_nutrition_entry();

create function public.save_nutrition_recipe(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid:=(p_document->>'id')::uuid; expected integer:=(p_document->>'revision')::integer; next_revision integer; item jsonb; pos integer:=0;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if coalesce(length(trim(p_document->>'name')),0) not between 1 and 200 or coalesce((p_document->>'servings')::numeric,0) not between 0.001 and 10000 or coalesce(length(p_document->>'instructions'),0)>10000
    or coalesce(jsonb_typeof(p_document->'ingredients'),'null')<>'array' or coalesce(jsonb_array_length(p_document->'ingredients'),0) not between 1 and 100 then raise exception 'Invalid recipe' using errcode='23514'; end if;
  if expected=0 then
    insert into public.recipes(id,owner_id,name,servings,instructions) values(rid,uid,trim(p_document->>'name'),(p_document->>'servings')::numeric,p_document->>'instructions') returning revision into next_revision;
  else
    update public.recipes set name=trim(p_document->>'name'),servings=(p_document->>'servings')::numeric,instructions=p_document->>'instructions',revision=revision+1 where id=rid and owner_id=uid and revision=expected and archived_at is null returning revision into next_revision;
    if not found then raise exception 'Recipe changed or unavailable' using errcode='PT409'; end if;
    delete from public.recipe_ingredients where recipe_id=rid and owner_id=uid;
  end if;
  for item in select value from jsonb_array_elements(p_document->'ingredients') loop
    if coalesce((item->>'grams')::numeric,0) not between 0.001 and 100000 then raise exception 'Invalid ingredient weight' using errcode='23514'; end if;
    if not exists(select 1 from public.foods where id=(item->>'foodId')::uuid and archived_at is null and (owner_id is null or owner_id=uid)) then raise exception 'Food is unavailable' using errcode='23514'; end if;
    insert into public.recipe_ingredients(owner_id,recipe_id,food_id,grams,position) values(uid,rid,(item->>'foodId')::uuid,(item->>'grams')::numeric,pos);pos:=pos+1;
  end loop;
  return jsonb_build_object('id',rid,'revision',next_revision);
end $$;

create function public.save_nutrition_entry(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); eid uuid:=(p_document->>'id')::uuid; expected integer:=(p_document->>'revision')::integer; result public.nutrition_entries%rowtype;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if expected=0 then
    insert into public.nutrition_entries(id,owner_id,food_id,recipe_id,logged_at,local_date,timezone,meal_slot,name_snapshot,quantity,unit_snapshot)
      values(eid,uid,(p_document->>'foodId')::uuid,(p_document->>'recipeId')::uuid,(p_document->>'loggedAt')::timestamptz,(p_document->>'date')::date,p_document->>'timezone',p_document->>'meal', '',(p_document->>'quantity')::numeric,p_document->>'unit') returning * into result;
  else
    update public.nutrition_entries set logged_at=(p_document->>'loggedAt')::timestamptz,local_date=(p_document->>'date')::date,timezone=p_document->>'timezone',meal_slot=p_document->>'meal',quantity=(p_document->>'quantity')::numeric,unit_snapshot=p_document->>'unit'
      where id=eid and owner_id=uid and revision=expected returning * into result;
    if not found then raise exception 'Entry changed or unavailable' using errcode='PT409'; end if;
  end if;
  return jsonb_build_object('id',result.id,'revision',result.revision);
end $$;

-- Serialize each owner's goal timeline without extensions; intervals cannot overlap.
create function public.guard_nutrition_goal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,37));
  if exists(select 1 from public.nutrition_goals g where g.owner_id=new.owner_id and g.id<>new.id and daterange(g.starts_on,g.ends_on,'[]') && daterange(new.starts_on,new.ends_on,'[]')) then
    raise exception 'Nutrition goal periods overlap' using errcode='23514';
  end if;
  return new;
end $$;
create trigger nutrition_goal_period before insert or update on public.nutrition_goals for each row execute function public.guard_nutrition_goal();
create function public.set_nutrition_goal(p_date date,p_kcal numeric,p_protein numeric,p_carbs numeric,p_fat numeric) returns void
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); next_date date;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kcal not between 1 and 20000 or p_protein not between 0 and 2000 or p_carbs not between 0 and 4000 or p_fat not between 0 and 2000 or p_date is null then raise exception 'Invalid nutrition goals' using errcode='23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,37));
  update public.nutrition_goals set kcal=p_kcal,protein_g=p_protein,carbs_g=p_carbs,fat_g=p_fat where owner_id=uid and starts_on=p_date;
  if found then return; end if;
  select min(starts_on) into next_date from public.nutrition_goals where owner_id=uid and starts_on>p_date;
  update public.nutrition_goals set ends_on=p_date-1 where owner_id=uid and starts_on<p_date and (ends_on is null or ends_on>=p_date);
  insert into public.nutrition_goals(owner_id,starts_on,ends_on,kcal,protein_g,carbs_g,fat_g) values(uid,p_date,next_date-1,p_kcal,p_protein,p_carbs,p_fat);
end $$;

revoke all on function public.guard_food_definition(), public.snapshot_nutrition_entry(), public.guard_nutrition_goal() from public,anon,authenticated;
revoke all on function public.recipe_nutrition_basis(uuid),public.save_nutrition_recipe(jsonb),public.save_nutrition_entry(jsonb),public.set_nutrition_goal(date,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.recipe_nutrition_basis(uuid),public.save_nutrition_recipe(jsonb),public.save_nutrition_entry(jsonb),public.set_nutrition_goal(date,numeric,numeric,numeric,numeric) to authenticated;
commit;
