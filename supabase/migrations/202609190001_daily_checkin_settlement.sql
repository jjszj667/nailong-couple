-- Daily effective check-ins, two-step makeup rewards and idempotent missing-day settlement.
-- Existing users start on the migration day: no retroactive deductions.
begin;

create table public.checkin_settlement_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  next_date date not null,
  consecutive_missed integer not null default 0 check (consecutive_missed >= 0)
);
create table public.checkin_daily_results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  status text not null check (status in ('completed', 'missed')),
  consecutive_missed integer not null check (consecutive_missed >= 0),
  planned_deduction integer not null check (planned_deduction between 0 and 5),
  actual_deduction integer not null check (actual_deduction >= 0 and actual_deduction <= planned_deduction),
  settled_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);
create index checkin_daily_results_user_date_idx on public.checkin_daily_results(user_id, checkin_date desc);
alter table public.checkin_settlement_state enable row level security;
alter table public.checkin_daily_results enable row level security;
create policy checkin_state_read_self on public.checkin_settlement_state
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy checkin_days_read_self on public.checkin_daily_results
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

insert into public.checkin_settlement_state(user_id, next_date)
select id, (now() at time zone 'Asia/Shanghai')::date
  + case when (now() at time zone 'Asia/Shanghai')::time >= time '22:00' then 1 else 0 end
from public.profiles
where role <> 'admin' on conflict do nothing;

create or replace function public.checkin_penalty(p_streak integer)
returns integer language sql immutable set search_path = '' as $$
  select case when p_streak <= 1 then 0 when p_streak = 2 then 3
    when p_streak = 3 then 4 else 5 end;
$$;
create or replace function public.makeup_reward(p_normal_reward integer, p_prior_makeups integer)
returns integer language sql immutable set search_path = '' as $$
  select case when p_prior_makeups = 0 then p_normal_reward / 2 else 0 end;
$$;
revoke all on function public.checkin_penalty(integer) from public, anon, authenticated;
revoke all on function public.makeup_reward(integer, integer) from public, anon, authenticated;

create or replace function public.enforce_checkin_window()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_time time := (now() at time zone 'Asia/Shanghai')::time;
  v_created date;
begin
  select (created_at at time zone 'Asia/Shanghai')::date into v_created
  from public.profiles where id = new.user_id;
  if new.checkin_date > v_today or new.checkin_date < v_created then
    raise exception 'INVALID_CHECKIN_DATE';
  end if;
  if new.checkin_kind = 'normal' then
    if new.checkin_date <> v_today then raise exception 'NORMAL_CHECKIN_TODAY_ONLY'; end if;
    if new.type = 'lunch' and not (v_time >= time '11:00' and v_time < time '14:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH';
    end if;
    if new.type = 'dinner' and not (v_time >= time '16:00' and v_time < time '22:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_DINNER';
    end if;
  elsif new.checkin_kind = 'makeup' then
    if new.checkin_date = v_today and new.type = 'lunch' and v_time < time '14:00' then
      raise exception 'CHECKIN_NOT_STARTED_LUNCH';
    end if;
    if new.checkin_date = v_today and new.type = 'dinner' and v_time < time '22:00' then
      raise exception 'CHECKIN_NOT_STARTED_DINNER';
    end if;
  else
    raise exception 'INVALID_CHECKIN_KIND';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_checkin_window() from public, anon, authenticated;

-- Internal function. Only the self-service wrapper and an optional pg_cron job invoke it.
create or replace function public.settle_checkin_days_for_user(p_user uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_time time := (now() at time zone 'Asia/Shanghai')::time;
  v_cutoff date;
  v_date date;
  v_streak integer;
  v_normal boolean;
  v_planned integer;
  v_actual integer;
  v_balance integer;
  v_count integer := 0;
begin
  if not exists(select 1 from public.profiles where id = p_user and role <> 'admin') then return 0; end if;
  v_cutoff := case when v_time >= time '22:00' then v_today else v_today - 1 end;
  insert into public.checkin_settlement_state(user_id, next_date)
  select id, greatest((created_at at time zone 'Asia/Shanghai')::date, date '2026-09-19')
  from public.profiles where id = p_user on conflict do nothing;
  select next_date, consecutive_missed into v_date, v_streak
  from public.checkin_settlement_state where user_id = p_user for update;
  while v_date <= v_cutoff loop
    select exists(select 1 from public.checkins
      where user_id = p_user and checkin_date = v_date and checkin_kind = 'normal') into v_normal;
    v_streak := case when v_normal then 0 else v_streak + 1 end;
    v_planned := case when v_normal then 0 else public.checkin_penalty(v_streak) end;
    select available_balance into v_balance from public.wallet_balances
      where user_id = p_user for update;
    if v_balance is null then raise exception 'WALLET_NOT_FOUND'; end if;
    v_actual := least(v_balance, v_planned);
    if v_actual > 0 then
      perform public.perform_wallet_change(p_user, -v_actual, 0, 'expense',
        'missed_checkin_penalty',
        '连续缺卡第 ' || v_streak || ' 天（' || v_date || '），应扣 ' || v_planned || ' 枚，实际扣 ' || v_actual || ' 枚',
        null, null, null, '每日签到结算');
    end if;
    insert into public.checkin_daily_results
      (user_id, checkin_date, status, consecutive_missed, planned_deduction, actual_deduction)
    values (p_user, v_date, case when v_normal then 'completed' else 'missed' end,
      v_streak, v_planned, v_actual);
    v_date := v_date + 1;
    v_count := v_count + 1;
    update public.checkin_settlement_state
      set next_date = v_date, consecutive_missed = v_streak where user_id = p_user;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.settle_checkin_days_for_user(uuid) from public, anon, authenticated;

create or replace function public.settle_my_checkin_days()
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return public.settle_checkin_days_for_user(auth.uid());
end;
$$;
revoke all on function public.settle_my_checkin_days() from public, anon;
grant execute on function public.settle_my_checkin_days() to authenticated;

-- If pg_cron is enabled, settle all participants shortly after 22:00 China time (14:05 UTC).
-- Otherwise the self-service RPC settles all elapsed days at the next authenticated visit.
do $$
begin
  if exists(select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule('couple-daily-checkin-settlement', '5 14 * * *',
        'select public.settle_checkin_days_for_user(id) from public.profiles where role <> ''admin''');
    exception when others then
      raise notice 'pg_cron schedule unavailable; settle_my_checkin_days will settle on visit: %', sqlerrm;
    end;
  end if;
end;
$$;

create or replace function public.submit_checkin(
  p_type public.checkin_type, p_image_url text, p_request_id uuid,
  p_checkin_kind text, p_checkin_date date
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_time time := (now() at time zone 'Asia/Shanghai')::time;
  v_target date := coalesce(p_checkin_date, (now() at time zone 'Asia/Shanghai')::date);
  v_checkin_id uuid;
  v_meal_reward integer;
  v_normal_reward integer;
  v_makeup_count integer;
  v_normal_count integer;
  v_daily_reward integer;
  v_streak_reward integer;
  v_streak integer := 0;
  v_day date;
  v_complete boolean;
  v_total integer := 0;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id = v_user and role <> 'admin') then
    raise exception 'ADMIN_CHECKIN_DISABLED';
  end if;
  if p_checkin_kind not in ('normal', 'makeup') or p_checkin_kind is null then
    raise exception 'INVALID_CHECKIN_KIND';
  end if;
  if v_target > v_today or v_target < (select (created_at at time zone 'Asia/Shanghai')::date
      from public.profiles where id = v_user) then raise exception 'INVALID_CHECKIN_DATE'; end if;
  if p_checkin_kind = 'normal' then
    if v_target <> v_today then raise exception 'NORMAL_CHECKIN_TODAY_ONLY'; end if;
    if p_type = 'lunch' and not (v_time >= time '11:00' and v_time < time '14:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH'; end if;
    if p_type = 'dinner' and not (v_time >= time '16:00' and v_time < time '22:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_DINNER'; end if;
  elsif v_target = v_today then
    if p_type = 'lunch' and v_time < time '14:00' then raise exception 'CHECKIN_NOT_STARTED_LUNCH'; end if;
    if p_type = 'dinner' and v_time < time '22:00' then raise exception 'CHECKIN_NOT_STARTED_DINNER'; end if;
  end if;
  if p_image_url is null or p_image_url = '' or split_part(p_image_url, '/', 1) <> v_user::text then
    raise exception 'INVALID_IMAGE_PATH'; end if;

  -- Catch up prior days before awarding today's coins, even for direct RPC callers.
  perform public.settle_checkin_days_for_user(v_user);

  -- Serialize reward-order decisions and wallet mutations for one user.
  perform 1 from public.wallet_balances where user_id = v_user for update;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;
  select value into v_normal_reward from public.system_settings
    where key = case p_type when 'lunch' then 'lunch_reward' else 'dinner_reward' end;
  if v_normal_reward is null then raise exception 'REWARD_RULE_MISSING'; end if;
  if p_checkin_kind = 'makeup' then
    select count(*) into v_makeup_count from public.checkins
      where user_id = v_user and checkin_date = v_target and checkin_kind = 'makeup';
    v_meal_reward := public.makeup_reward(v_normal_reward, v_makeup_count);
  else
    v_meal_reward := v_normal_reward;
  end if;

  begin
    insert into public.checkins
      (user_id, type, checkin_date, image_url, reward_amount, request_id, checkin_kind)
    values (v_user, p_type, v_target, p_image_url, v_meal_reward, p_request_id, p_checkin_kind)
    returning id into v_checkin_id;
  exception when unique_violation then
    select id into v_checkin_id from public.checkins
      where user_id = v_user and request_id = p_request_id;
    if v_checkin_id is not null then
      return jsonb_build_object('checkin_id', v_checkin_id, 'idempotent', true);
    end if;
    raise exception 'ALREADY_CHECKED_IN';
  end;

  if p_checkin_kind = 'normal' then
    update public.checkin_settlement_state
      set consecutive_missed = 0 where user_id = v_user;
  end if;

  if v_meal_reward > 0 then
    perform public.perform_wallet_change(v_user, v_meal_reward, 0, 'income',
      case when p_checkin_kind = 'makeup' then 'checkin_makeup_reward' else 'checkin_reward' end,
      case when p_checkin_kind = 'makeup' then '补签奖励（当天首次补签）' else '准时签到奖励' end,
      null, v_checkin_id, v_user, null);
    v_total := v_meal_reward;
  end if;

  -- Preserve the existing full-day bonus only when both meals were on time.
  if p_checkin_kind = 'normal' then
    select count(*) into v_normal_count from public.checkins
      where user_id = v_user and checkin_date = v_target and checkin_kind = 'normal';
    if v_normal_count = 2 then
      select value into v_daily_reward from public.system_settings where key = 'daily_complete_reward';
      if v_daily_reward is null then raise exception 'REWARD_RULE_MISSING'; end if;
      insert into public.reward_claims(user_id, reward_type, reward_date, checkin_id, amount)
      values (v_user, 'daily_complete', v_target, v_checkin_id, v_daily_reward)
      on conflict do nothing;
      if found and v_daily_reward > 0 then
        perform public.perform_wallet_change(v_user, v_daily_reward, 0, 'income',
          'daily_complete_reward', '今日两个时段均准时签到', null, v_checkin_id, v_user, null);
        v_total := v_total + v_daily_reward;
      end if;
      -- Preserve the existing 7/30-day reward for two on-time meals.
      v_day := v_target;
      loop
        select count(*) = 2 into v_complete from public.checkins
          where user_id = v_user and checkin_date = v_day and checkin_kind = 'normal';
        exit when not v_complete;
        v_streak := v_streak + 1;
        v_day := v_day - 1;
      end loop;
      if v_streak in (7, 30) then
        select value into v_streak_reward from public.system_settings
          where key = case when v_streak = 7 then 'streak_7_reward' else 'streak_30_reward' end;
        if v_streak_reward is null then raise exception 'REWARD_RULE_MISSING'; end if;
        insert into public.reward_claims(user_id, reward_type, reward_date, checkin_id, amount)
        values (v_user, case when v_streak = 7 then 'streak_7' else 'streak_30' end,
          v_target, v_checkin_id, v_streak_reward) on conflict do nothing;
        if found and v_streak_reward > 0 then
          perform public.perform_wallet_change(v_user, v_streak_reward, 0, 'income',
            'streak_reward', '连续 ' || v_streak || ' 天两餐准时签到',
            null, v_checkin_id, v_user, null);
          v_total := v_total + v_streak_reward;
        end if;
      end if;
    end if;
  end if;
  return jsonb_build_object('checkin_id', v_checkin_id, 'reward', v_total,
    'meal_reward', v_meal_reward, 'checkin_kind', p_checkin_kind, 'idempotent', false);
end;
$$;
revoke all on function public.submit_checkin(public.checkin_type,text,uuid,text,date) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type,text,uuid,text,date) to authenticated;

-- Existing four- and three-argument callers stay on server-validated current-day logic.
create or replace function public.submit_checkin(
  p_type public.checkin_type, p_image_url text, p_request_id uuid, p_checkin_kind text
)
returns jsonb language sql security invoker set search_path = '' as $$
  select public.submit_checkin(p_type,p_image_url,p_request_id,p_checkin_kind,
    (now() at time zone 'Asia/Shanghai')::date);
$$;
revoke all on function public.submit_checkin(public.checkin_type,text,uuid,text) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type,text,uuid,text) to authenticated;

commit;
