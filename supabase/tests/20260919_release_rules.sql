-- Run in SQL Editor after 202609190002. Structural assertions, no data changes.
begin;
do $$
begin
  if to_regprocedure('public.acknowledge_release(uuid)') is null then
    raise exception 'release acknowledgement RPC missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.release_announcements'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.release_announcement_reads'::regclass) then
    raise exception 'release RLS not enabled';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.release_announcement_reads'::regclass and contype = 'p') then
    raise exception 'read receipt idempotency key missing';
  end if;
  raise notice 'release structure assertions passed';
end;
$$;
rollback;
