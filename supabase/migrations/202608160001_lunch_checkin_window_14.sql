-- Extend the lunch check-in window to 11:00-14:00 China Standard Time.

create or replace function public.enforce_checkin_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_local_time time := (now() at time zone 'Asia/Shanghai')::time;
begin
  if new.type = 'lunch' and not (v_local_time >= time '11:00' and v_local_time < time '14:00') then
    raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH';
  end if;

  if new.type = 'dinner' and not (v_local_time >= time '16:00' and v_local_time < time '22:00') then
    raise exception 'CHECKIN_WINDOW_CLOSED_DINNER';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_checkin_window() from public, anon, authenticated;

create or replace function public.submit_checkin(
  p_type public.checkin_type,
  p_image_url text,
  p_request_id uuid
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
  if p_type = 'lunch' and not (v_local_time >= time '11:00' and v_local_time < time '14:00') then
    raise exception 'CHECKIN_WINDOW_CLOSED_LUNCH';
  end if;
  if p_type = 'dinner' and not (v_local_time >= time '16:00' and v_local_time < time '22:00') then
    raise exception 'CHECKIN_WINDOW_CLOSED_DINNER';
  end if;
  if p_image_url is null or p_image_url = '' or split_part(p_image_url, '/', 1) <> v_user::text then
    raise exception 'INVALID_IMAGE_PATH';
  end if;

  select value into v_meal_reward from public.system_settings
  where key = case p_type when 'lunch' then 'lunch_reward' else 'dinner_reward' end;
  if v_meal_reward is null then raise exception 'REWARD_RULE_MISSING'; end if;

  begin
    insert into public.checkins (user_id, type, checkin_date, image_url, reward_amount, request_id)
    values (v_user, p_type, v_today, p_image_url, v_meal_reward, p_request_id)
    returning id into v_checkin_id;
  exception when unique_violation then
    select id into v_checkin_id from public.checkins
    where user_id = v_user and request_id = p_request_id;
    if v_checkin_id is not null then
      return jsonb_build_object('checkin_id', v_checkin_id, 'idempotent', true);
    end if;
    raise exception 'ALREADY_CHECKED_IN';
  end;

  perform public.perform_wallet_change(
    v_user, v_meal_reward, 0, 'income', 'checkin_reward',
    case p_type when 'lunch' then '午间限时签到' else '晚间限时签到' end,
    null, v_checkin_id, v_user, null
  );
  v_total := v_total + v_meal_reward;

  select count(*) into v_meal_count from public.checkins
  where user_id = v_user and checkin_date = v_today;

  if v_meal_count = 2 then
    select value into v_daily_reward from public.system_settings where key = 'daily_complete_reward';
    insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
    values (v_user, 'daily_complete', v_today, v_checkin_id, v_daily_reward)
    on conflict do nothing;
    if found and v_daily_reward > 0 then
      perform public.perform_wallet_change(v_user, v_daily_reward, 0, 'income', 'daily_complete_reward', '今日两个限时时段任务完成', null, v_checkin_id, v_user, null);
      v_total := v_total + v_daily_reward;
    end if;

    v_day := v_today;
    loop
      select count(*) = 2 into v_complete from public.checkins
      where user_id = v_user and checkin_date = v_day;
      exit when not v_complete;
      v_streak := v_streak + 1;
      v_day := v_day - 1;
    end loop;

    if v_streak = 7 then
      select value into v_streak7_reward from public.system_settings where key = 'streak_7_reward';
      insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
      values (v_user, 'streak_7', v_today, v_checkin_id, v_streak7_reward)
      on conflict do nothing;
      if found and v_streak7_reward > 0 then
        perform public.perform_wallet_change(v_user, v_streak7_reward, 0, 'income', 'streak_reward', '连续 7 天好好吃饭', null, v_checkin_id, v_user, null);
        v_total := v_total + v_streak7_reward;
      end if;
    end if;

    if v_streak = 30 then
      select value into v_streak30_reward from public.system_settings where key = 'streak_30_reward';
      insert into public.reward_claims (user_id, reward_type, reward_date, checkin_id, amount)
      values (v_user, 'streak_30', v_today, v_checkin_id, v_streak30_reward)
      on conflict do nothing;
      if found and v_streak30_reward > 0 then
        perform public.perform_wallet_change(v_user, v_streak30_reward, 0, 'income', 'streak_reward', '连续 30 天好好吃饭', null, v_checkin_id, v_user, null);
        v_total := v_total + v_streak30_reward;
      end if;
    end if;
  end if;

  return jsonb_build_object('checkin_id', v_checkin_id, 'reward', v_total, 'streak', v_streak, 'idempotent', false);
end;
$$;

revoke all on function public.submit_checkin(public.checkin_type, text, uuid) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type, text, uuid) to authenticated;

update public.system_settings
set label = '午间限时签到奖励', description = '每天 11:00–14:00 完成照片签到后发放'
where key = 'lunch_reward';
