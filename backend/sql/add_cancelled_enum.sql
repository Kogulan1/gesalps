-- Add 'cancelled' value to run_status enum
-- Run this in your Supabase SQL Editor

do $$
begin
  -- Check if 'cancelled' already exists
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'cancelled' 
    and enumtypid = (select oid from pg_type where typname = 'run_status')
  ) then
    alter type run_status add value 'cancelled';
    raise notice 'Added ''cancelled'' to run_status enum';
  else
    raise notice '''cancelled'' already exists in run_status enum';
  end if;
end $$;

