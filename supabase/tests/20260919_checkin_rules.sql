-- Run in SQL Editor after 202609190001. Read-only rule assertions; no user balance changes.
begin;
do $$
begin
  if public.checkin_penalty(1) <> 0 or public.checkin_penalty(2) <> 3
     or public.checkin_penalty(3) <> 4 or public.checkin_penalty(4) <> 5
     or public.checkin_penalty(40) <> 5 then
    raise exception 'penalty schedule failed';
  end if;
  if public.makeup_reward(10, 0) <> 5 or public.makeup_reward(9, 0) <> 4
     or public.makeup_reward(10, 1) <> 0 then
    raise exception 'makeup reward order failed';
  end if;
  if least(2, public.checkin_penalty(4)) <> 2 then
    raise exception 'insufficient-balance cap failed';
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.checkin_daily_results'::regclass and contype = 'p') then
    raise exception 'daily idempotency key missing';
  end if;
  raise notice 'check-in rule assertions passed';
end;
$$;
rollback;
