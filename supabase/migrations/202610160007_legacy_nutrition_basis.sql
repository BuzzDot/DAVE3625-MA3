-- Preserve every legacy snapshot field when no recalculation basis exists.
begin;
create or replace function public.snapshot_nutrition_entry() returns trigger language plpgsql security invoker set search_path='' as $$
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
      new.basis_snapshot:=old.basis_snapshot;new.source:=old.source;new.external_id:=old.external_id;new.verified_at:=old.verified_at;
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
commit;
