begin;

-- 管理员只查看对方签到、管理商品，不作为奖励体系的参与者。
create or replace function public.prevent_admin_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.user_id and role = 'admin'
  ) then
    raise exception 'ADMIN_CHECKIN_DISABLED';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_admin_checkin() from public, anon, authenticated;

drop trigger if exists checkins_block_admin_insert on public.checkins;
create trigger checkins_block_admin_insert
before insert on public.checkins
for each row execute function public.prevent_admin_checkin();

create or replace function public.prevent_admin_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.user_id and role = 'admin'
  ) then
    raise exception 'ADMIN_REDEMPTION_DISABLED';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_admin_redemption() from public, anon, authenticated;

drop trigger if exists orders_block_admin_insert on public.orders;
create trigger orders_block_admin_insert
before insert on public.orders
for each row execute function public.prevent_admin_redemption();

commit;
