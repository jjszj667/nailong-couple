-- Enforce meal check-in windows using China Standard Time (Asia/Shanghai).
-- The trigger protects existing projects without rewriting historical rows.

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

drop trigger if exists enforce_checkin_window_before_insert on public.checkins;
create trigger enforce_checkin_window_before_insert
before insert on public.checkins
for each row execute function public.enforce_checkin_window();

revoke all on function public.enforce_checkin_window() from public, anon, authenticated;

update public.system_settings
set label = '午间限时签到奖励', description = '每天 11:00–14:00 完成照片签到后发放'
where key = 'lunch_reward';

update public.system_settings
set label = '晚间限时签到奖励', description = '每天 16:00–22:00 完成照片签到后发放'
where key = 'dinner_reward';

update public.system_settings
set description = '同一天午间和晚间限时签到都完成后发放'
where key = 'daily_complete_reward';
