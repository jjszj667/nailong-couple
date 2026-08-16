-- Add same-day meal makeup check-ins without changing historical records.
-- Existing rows are backfilled as normal; all rewards remain atomic in submit_checkin.

begin;

alter table public.checkins
  add column if not exists checkin_kind text;

update public.checkins
set checkin_kind = 'normal'
where checkin_kind is null;

alter table public.checkins
  alter column checkin_kind set default 'normal',
  alter column checkin_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkins_checkin_kind_check'
      and conrelid = 'public.checkins'::regclass
  ) then
    alter table public.checkins
      add constraint checkins_checkin_kind_check
      check (checkin_kind in ('normal', 'makeup'));
  end if;
end
$$;

create or replace function public.enforce_checkin_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_local_time time := (now() at time zone 'Asia/Shanghai')::time;
begin
  if new.checkin_kind = 'normal' then
    if new.type = 'lunch' and not (v_local_time >= time '11:00' and v_local_time < time '14:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH';
    end if;
    if new.type = 'dinner' and not (v_local_time >= time '16:00' and v_local_time < time '22:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_DINNER';
    end if;
  elsif new.checkin_kind = 'makeup' then
    if new.type = 'lunch' and v_local_time < time '14:00' then
      raise exception 'CHECKIN_NOT_STARTED_LUNCH';
    end if;
    if new.type = 'dinner' and v_local_time < time '22:00' then
      raise exception 'CHECKIN_NOT_STARTED_DINNER';
    end if;
  else
    raise exception 'INVALID_CHECKIN_KIND';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_checkin_window() from public, anon, authenticated;

create or replace function public.submit_checkin(
  p_type public.checkin_type,
  p_image_url text,
  p_request_id uuid,
  p_checkin_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_local_time time := (now() at time zone 'Asia/Shanghai')::time;
  v_day date;
  v_checkin_id uuid;
  v_meal_reward integer;
  v_daily_reward integer;
  v_streak7_reward integer;
  v_streak30_reward integer;
  v_total integer := 0;
  v_meal_count integer;
  v_streak integer := 0;
  v_complete boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_checkin_kind is null or p_checkin_kind not in ('normal', 'makeup') then
    raise exception 'INVALID_CHECKIN_KIND';
  end if;

  if p_checkin_kind = 'normal' then
    if p_type = 'lunch' and not (v_local_time >= time '11:00' and v_local_time < time '14:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH';
    end if;
    if p_type = 'dinner' and not (v_local_time >= time '16:00' and v_local_time < time '22:00') then
      raise exception 'CHECKIN_WINDOW_CLOSED_DINNER';
    end if;
  else
    if p_type = 'lunch' and v_local_time < time '14:00' then
      raise exception 'CHECKIN_NOT_STARTED_LUNCH';
    end if;
    if p_type = 'dinner' and v_local_time < time '22:00' then
      raise exception 'CHECKIN_NOT_STARTED_DINNER';
    end if;
  end if;

  if p_image_url is null or p_image_url = '' or split_part(p_image_url, '/', 1) <> v_user::text then
    raise exception 'INVALID_IMAGE_PATH';
  end if;

  if p_checkin_kind = 'makeup' then
    v_meal_reward := 1;
  else
    select value into v_meal_reward
    from public.system_settings
    where key = case p_type when 'lunch' then 'lunch_reward' else 'dinner_reward' end;
    if v_meal_reward is null then raise exception 'REWARD_RULE_MISSING'; end if;
  end if;

  begin
    insert into public.checkins (
      user_id, type, checkin_date, image_url, reward_amount, request_id, checkin_kind
    ) values (
      v_user, p_type, v_today, p_image_url, v_meal_reward, p_request_id, p_checkin_kind
    ) returning id into v_checkin_id;
  exception when unique_violation then
    select id into v_checkin_id
    from public.checkins
    where user_id = v_user and request_id = p_request_id;
    if v_checkin_id is not null then
      return jsonb_build_object('checkin_id', v_checkin_id, 'idempotent', true);
    end if;
    raise exception 'ALREADY_CHECKED_IN';
  end;

  perform public.perform_wallet_change(
    v_user, v_meal_reward, 0, 'income',
    case p_checkin_kind when 'makeup' then 'checkin_makeup_reward' else 'checkin_reward' end,
    case
      when p_checkin_kind = 'makeup' and p_type = 'lunch' then '午间补签'
      when p_checkin_kind = 'makeup' and p_type = 'dinner' then '晚间补签'
      when p_type = 'lunch' then '午间限时签到'
      else '晚间限时签到'
    end,
    null, v_checkin_id, v_user, null
  );
  v_total := v_total + v_meal_reward;

  -- Makeup check-ins are recorded as complete meals, but only two normal
  -- check-ins can unlock the daily-complete and streak rewards.
  if p_checkin_kind = 'normal' then
    select count(*) into v_meal_count
    from public.checkins
    where user_id = v_user
      and checkin_date = v_today
      and checkin_kind = 'normal';

    if v_meal_count = 2 then
      select value into v_daily_reward
      from public.system_settings
      where key = 'daily_complete_reward';
      insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
      values (v_user, 'daily_complete', v_today, v_checkin_id, v_daily_reward)
      on conflict do nothing;
      if found and v_daily_reward > 0 then
        perform public.perform_wallet_change(
          v_user, v_daily_reward, 0, 'income', 'daily_complete_reward',
          '今日两个限时时段任务完成', null, v_checkin_id, v_user, null
        );
        v_total := v_total + v_daily_reward;
      end if;

      v_day := v_today;
      loop
        select count(*) = 2 into v_complete
        from public.checkins
        where user_id = v_user
          and checkin_date = v_day
          and checkin_kind = 'normal';
        exit when not v_complete;
        v_streak := v_streak + 1;
        v_day := v_day - 1;
      end loop;

      if v_streak = 7 then
        select value into v_streak7_reward
        from public.system_settings
        where key = 'streak_7_reward';
        insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
        values (v_user, 'streak_7', v_today, v_checkin_id, v_streak7_reward)
        on conflict do nothing;
        if found and v_streak7_reward > 0 then
          perform public.perform_wallet_change(
            v_user, v_streak7_reward, 0, 'income', 'streak_reward',
            '连续 7 天好好吃饭', null, v_checkin_id, v_user, null
          );
          v_total := v_total + v_streak7_reward;
        end if;
      end if;

      if v_streak = 30 then
        select value into v_streak30_reward
        from public.system_settings
        where key = 'streak_30_reward';
        insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
        values (v_user, 'streak_30', v_today, v_checkin_id, v_streak30_reward)
        on conflict do nothing;
        if found and v_streak30_reward > 0 then
          perform public.perform_wallet_change(
            v_user, v_streak30_reward, 0, 'income', 'streak_reward',
            '连续 30 天好好吃饭', null, v_checkin_id, v_user, null
          );
          v_total := v_total + v_streak30_reward;
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'checkin_id', v_checkin_id,
    'reward', v_total,
    'streak', v_streak,
    'checkin_kind', p_checkin_kind,
    'idempotent', false
  );
end;
$$;

revoke all on function public.submit_checkin(public.checkin_type, text, uuid, text) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type, text, uuid, text) to authenticated;

-- Keep the previous RPC signature safe for clients that were already open
-- during deployment. It can only request a server-validated normal check-in.
create or replace function public.submit_checkin(
  p_type public.checkin_type,
  p_image_url text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.submit_checkin(p_type, p_image_url, p_request_id, 'normal');
$$;

revoke all on function public.submit_checkin(public.checkin_type, text, uuid) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type, text, uuid) to authenticated;

create or replace function public.refresh_achievements(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_day date;
  v_streak integer := 0;
  v_moods integer := 0;
  v_coins integer := 0;
  v_orders integer := 0;
  v_events integer := 0;
  v_wishes integer := 0;
  v_complete boolean;
  v_inserted integer := 0;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_user <> v_actor and not public.is_admin(v_actor) then raise exception 'FORBIDDEN'; end if;
  v_day := v_today;
  loop
    select count(distinct type) = 2 into v_complete
    from public.checkins
    where user_id = v_user
      and checkin_date = v_day
      and checkin_kind = 'normal';
    exit when not v_complete;
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;
  select count(*) into v_moods from public.moods where user_id = v_user;
  select coalesce(sum(amount), 0) into v_coins from public.wallet_transactions where user_id = v_user and direction = 'income';
  select count(*) into v_orders from public.orders where user_id = v_user and status = 'completed';
  select count(*) into v_events from public.calendar_events where created_by = v_user;
  select count(*) into v_wishes from public.wishes where user_id = v_user and status = 'completed';

  insert into public.user_achievements (user_id, achievement_id)
  select v_user, d.id from public.achievement_definitions d
  where d.is_active and case d.metric
    when 'meal_streak' then v_streak >= d.target
    when 'mood_days' then v_moods >= d.target
    when 'coins_earned' then v_coins >= d.target
    when 'orders_completed' then v_orders >= d.target
    when 'calendar_events' then v_events >= d.target
    when 'wishes_completed' then v_wishes >= d.target
    else false end
  on conflict (user_id, achievement_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

commit;
