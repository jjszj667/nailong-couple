-- 奶龙情侣点单站：完整初始结构、RLS、Storage 与原子业务函数
-- 所有业务时间戳保存为 UTC；“今天/本月/连续天数”统一按 Asia/Shanghai 判断。

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'user');
create type public.checkin_type as enum ('lunch', 'dinner');
create type public.product_status as enum ('active', 'inactive', 'sold_out');
create type public.product_category as enum ('food', 'date', 'gift', 'game', 'special', 'other');
create type public.order_status as enum ('pending', 'approved', 'rejected', 'pending_fulfillment', 'completed', 'cancelled');
create type public.wallet_direction as enum ('income', 'expense', 'freeze', 'unfreeze');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '小可爱' check (char_length(nickname) between 1 and 30),
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_balance integer not null default 0 check (available_balance >= 0),
  frozen_balance integer not null default 0 check (frozen_balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value integer not null check (value >= 0),
  label text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  image_url text,
  price integer not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  category public.product_category not null default 'other',
  status public.product_status not null default 'active',
  is_hidden boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.checkin_type not null,
  checkin_date date not null,
  image_url text not null,
  reward_amount integer not null default 0 check (reward_amount >= 0),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date, type),
  unique (user_id, request_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  price_snapshot integer not null check (price_snapshot > 0),
  status public.order_status not null default 'pending',
  request_id uuid not null,
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  direction public.wallet_direction not null,
  type text not null,
  reason text not null,
  before_balance integer not null check (before_balance >= 0),
  after_balance integer not null check (after_balance >= 0),
  before_frozen_balance integer not null check (before_frozen_balance >= 0),
  after_frozen_balance integer not null check (after_frozen_balance >= 0),
  related_order_id uuid references public.orders(id) on delete set null,
  related_checkin_id uuid references public.checkins(id) on delete set null,
  operator_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null,
  reward_date date not null,
  checkin_id uuid references public.checkins(id) on delete set null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, reward_type, reward_date)
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  operator_id uuid not null references public.profiles(id) on delete restrict,
  note text,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  content text not null check (char_length(content) between 1 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index checkins_user_date_idx on public.checkins (user_id, checkin_date desc);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index wallet_transactions_user_created_idx on public.wallet_transactions (user_id, created_at desc);
create index products_visibility_idx on public.products (status, is_hidden, is_featured);
create index announcements_active_created_idx on public.announcements (is_active, created_at desc);
create index order_events_order_created_idx on public.order_events (order_id, created_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger wallets_touch before update on public.wallet_balances
for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();
create trigger announcements_touch before update on public.announcements
for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.system_settings
for each row execute function public.touch_updated_at();

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(coalesce(new.email, '小可爱'), '@', 1)), 30));
  insert into public.wallet_balances (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.role := old.role;
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields before update on public.profiles
for each row execute function public.guard_profile_update();

-- 仅供下方 SECURITY DEFINER 业务函数调用，保证余额与流水同一事务写入。
create or replace function public.perform_wallet_change(
  p_user_id uuid,
  p_available_delta integer,
  p_frozen_delta integer,
  p_direction public.wallet_direction,
  p_type text,
  p_reason text,
  p_related_order_id uuid default null,
  p_related_checkin_id uuid default null,
  p_operator_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before_available integer;
  v_before_frozen integer;
  v_after_available integer;
  v_after_frozen integer;
  v_transaction_id uuid;
  v_amount integer;
begin
  select available_balance, frozen_balance
    into v_before_available, v_before_frozen
  from public.wallet_balances
  where user_id = p_user_id
  for update;

  if not found then raise exception 'WALLET_NOT_FOUND'; end if;

  v_after_available := v_before_available + p_available_delta;
  v_after_frozen := v_before_frozen + p_frozen_delta;
  if v_after_available < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if v_after_frozen < 0 then raise exception 'INVALID_FROZEN_BALANCE'; end if;

  update public.wallet_balances
  set available_balance = v_after_available, frozen_balance = v_after_frozen
  where user_id = p_user_id;

  v_amount := case
    when p_direction = 'expense' then -greatest(abs(p_available_delta), abs(p_frozen_delta))
    else greatest(abs(p_available_delta), abs(p_frozen_delta))
  end;

  insert into public.wallet_transactions (
    user_id, amount, direction, type, reason,
    before_balance, after_balance, before_frozen_balance, after_frozen_balance,
    related_order_id, related_checkin_id, operator_id, note
  ) values (
    p_user_id, v_amount, p_direction, p_type, p_reason,
    v_before_available, v_after_available, v_before_frozen, v_after_frozen,
    p_related_order_id, p_related_checkin_id, p_operator_id, p_note
  ) returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

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
    case p_type when 'lunch' then '午饭乖乖打卡' else '晚饭乖乖打卡' end,
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
      perform public.perform_wallet_change(v_user, v_daily_reward, 0, 'income', 'daily_complete_reward', '今日两餐任务完成', null, v_checkin_id, v_user, null);
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

create or replace function public.request_redemption(p_product_id uuid, p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_product public.products%rowtype;
  v_order_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_product from public.products where id = p_product_id for update;
  if not found or v_product.status = 'inactive' or v_product.is_hidden then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if v_product.status = 'sold_out' or v_product.stock <= 0 then raise exception 'OUT_OF_STOCK'; end if;

  begin
    insert into public.orders (user_id, product_id, product_name_snapshot, price_snapshot, request_id)
    values (v_user, v_product.id, v_product.name, v_product.price, p_request_id)
    returning id into v_order_id;
  exception when unique_violation then
    select id into v_order_id from public.orders where user_id = v_user and request_id = p_request_id;
    return v_order_id;
  end;

  perform public.perform_wallet_change(v_user, -v_product.price, v_product.price, 'freeze', 'order_freeze', '申请兑换「' || v_product.name || '」', v_order_id, null, v_user, null);
  insert into public.order_events (order_id, from_status, to_status, operator_id)
  values (v_order_id, null, 'pending', v_user);
  return v_order_id;
end;
$$;

create or replace function public.cancel_redemption(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id <> v_user then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'pending' then raise exception 'ORDER_CANNOT_CANCEL'; end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
  perform public.perform_wallet_change(v_user, v_order.price_snapshot, -v_order.price_snapshot, 'unfreeze', 'order_refund', '取消兑换，奶龙币已退回', p_order_id, null, v_user, null);
  insert into public.order_events (order_id, from_status, to_status, operator_id)
  values (p_order_id, 'pending', 'cancelled', v_user);
end;
$$;

create or replace function public.admin_process_order(p_order_id uuid, p_action text, p_note text default null)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_order public.orders%rowtype;
  v_next public.order_status;
  v_product_stock integer;
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_action = 'approve' then
    if v_order.status <> 'pending' then raise exception 'ORDER_ALREADY_PROCESSED'; end if;
    select stock into v_product_stock from public.products where id = v_order.product_id for update;
    if v_product_stock <= 0 then raise exception 'OUT_OF_STOCK'; end if;
    update public.products
      set stock = stock - 1,
          status = case when stock - 1 = 0 then 'sold_out' else status end
      where id = v_order.product_id;
    perform public.perform_wallet_change(v_order.user_id, 0, -v_order.price_snapshot, 'expense', 'order_payment', '兑换申请已批准', p_order_id, null, v_admin, p_note);
    v_next := 'pending_fulfillment';
    update public.orders set status = v_next, approved_at = now(), admin_note = p_note where id = p_order_id;
  elsif p_action = 'reject' then
    if v_order.status <> 'pending' then raise exception 'ORDER_ALREADY_PROCESSED'; end if;
    perform public.perform_wallet_change(v_order.user_id, v_order.price_snapshot, -v_order.price_snapshot, 'unfreeze', 'order_refund', '兑换申请未通过，奶龙币已退回', p_order_id, null, v_admin, p_note);
    v_next := 'rejected';
    update public.orders set status = v_next, admin_note = p_note where id = p_order_id;
  elsif p_action = 'complete' then
    if v_order.status <> 'pending_fulfillment' then raise exception 'ORDER_NOT_READY'; end if;
    v_next := 'completed';
    update public.orders set status = v_next, completed_at = now(), admin_note = coalesce(p_note, admin_note) where id = p_order_id;
  else
    raise exception 'INVALID_ORDER_ACTION';
  end if;

  insert into public.order_events (order_id, from_status, to_status, operator_id, note)
  values (p_order_id, v_order.status, v_next, v_admin, p_note);
  insert into public.admin_logs (operator_id, action, target_type, target_id, details)
  values (v_admin, 'order_' || p_action, 'order', p_order_id, jsonb_build_object('from', v_order.status, 'to', v_next));
  return v_next;
end;
$$;

create or replace function public.admin_adjust_wallet(p_user_id uuid, p_amount integer, p_reason text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := auth.uid();
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_amount = 0 then raise exception 'AMOUNT_CANNOT_BE_ZERO'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 2 then raise exception 'REASON_REQUIRED'; end if;
  perform public.perform_wallet_change(
    p_user_id, p_amount, 0,
    case when p_amount > 0 then 'income'::public.wallet_direction else 'expense'::public.wallet_direction end,
    case when p_amount > 0 then 'admin_grant' else 'admin_deduct' end,
    p_reason, null, null, v_admin, p_note
  );
  insert into public.admin_logs (operator_id, action, target_type, target_id, details)
  values (v_admin, 'wallet_adjust', 'profile', p_user_id, jsonb_build_object('amount', p_amount, 'reason', p_reason));
end;
$$;

create or replace function public.admin_update_settings(p_settings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_key text;
  v_value integer;
  v_allowed constant text[] := array['lunch_reward', 'dinner_reward', 'daily_complete_reward', 'streak_7_reward', 'streak_30_reward'];
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  foreach v_key in array v_allowed loop
    if not (p_settings ? v_key) then raise exception 'SETTING_MISSING'; end if;
    begin
      v_value := (p_settings ->> v_key)::integer;
    exception when others then
      raise exception 'INVALID_SETTING_VALUE';
    end;
    if v_value < 0 then raise exception 'INVALID_SETTING_VALUE'; end if;
    update public.system_settings set value = v_value, updated_by = v_admin where key = v_key;
    if not found then raise exception 'SETTING_MISSING'; end if;
  end loop;
  insert into public.admin_logs (operator_id, action, target_type, details)
  values (v_admin, 'settings_update', 'system_settings', p_settings);
end;
$$;

-- RLS：关键表无客户端写策略，所有余额、签到、订单状态变化只能走上方原子函数。
alter table public.profiles enable row level security;
alter table public.wallet_balances enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.checkins enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.reward_claims enable row level security;
alter table public.order_events enable row level security;
alter table public.system_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.admin_logs enable row level security;

create policy "profiles_read_own_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "wallets_read_own_or_admin" on public.wallet_balances for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "transactions_read_own_or_admin" on public.wallet_transactions for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "checkins_read_own_or_admin" on public.checkins for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "products_read_visible_or_admin" on public.products for select to authenticated
using ((status <> 'inactive' and not is_hidden) or public.is_admin());
create policy "products_admin_insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products_admin_update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products for delete to authenticated using (public.is_admin());
create policy "orders_read_own_or_admin" on public.orders for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "reward_claims_read_own_or_admin" on public.reward_claims for select to authenticated
using (user_id = auth.uid() or public.is_admin());
create policy "order_events_read_own_or_admin" on public.order_events for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "settings_authenticated_read" on public.system_settings for select to authenticated using (true);
create policy "settings_admin_update" on public.system_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "announcements_read_active_or_admin" on public.announcements for select to authenticated
using (is_active or public.is_admin());
create policy "announcements_admin_insert" on public.announcements for insert to authenticated with check (public.is_admin());
create policy "announcements_admin_update" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "announcements_admin_delete" on public.announcements for delete to authenticated using (public.is_admin());
create policy "admin_logs_admin_read" on public.admin_logs for select to authenticated using (public.is_admin());

revoke all on function public.perform_wallet_change(uuid, integer, integer, public.wallet_direction, text, text, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_checkin(public.checkin_type, text, uuid) from public, anon;
revoke all on function public.request_redemption(uuid, uuid) from public, anon;
revoke all on function public.cancel_redemption(uuid) from public, anon;
revoke all on function public.admin_process_order(uuid, text, text) from public, anon;
revoke all on function public.admin_adjust_wallet(uuid, integer, text, text) from public, anon;
revoke all on function public.admin_update_settings(jsonb) from public, anon;
grant execute on function public.submit_checkin(public.checkin_type, text, uuid) to authenticated;
grant execute on function public.request_redemption(uuid, uuid) to authenticated;
grant execute on function public.cancel_redemption(uuid) to authenticated;
grant execute on function public.admin_process_order(uuid, text, text) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, integer, text, text) to authenticated;
grant execute on function public.admin_update_settings(jsonb) to authenticated;

insert into public.system_settings (key, value, label, description) values
  ('lunch_reward', 5, '午饭签到奖励', '完成午饭照片签到后发放'),
  ('dinner_reward', 5, '晚饭签到奖励', '完成晚饭照片签到后发放'),
  ('daily_complete_reward', 5, '完整签到奖励', '同一天午饭和晚饭都完成后发放'),
  ('streak_7_reward', 20, '连续 7 天奖励', '连续 7 个完整签到日后发放'),
  ('streak_30_reward', 100, '连续 30 天奖励', '连续 30 个完整签到日后发放');

insert into public.products (name, description, price, stock, category, status, is_featured, is_hidden) values
  ('奶茶券', '挑一家喜欢的店，兑换一杯今天想喝的奶茶。', 80, 99, 'food', 'active', true, false),
  ('一起吃饭', '认真挑个地方，留一顿只属于我们的饭。', 350, 99, 'date', 'active', true, false),
  ('一起看电影', '选一部片子，爆米花也安排上。', 600, 99, 'date', 'active', true, false),
  ('神秘礼物', '暂时不剧透，兑换后等一份小惊喜。', 1000, 10, 'gift', 'active', true, true),
  ('见面券', '攒下来的每一枚奶龙币，都在让见面更近一点。', 2000, 99, 'special', 'active', true, false);

insert into public.announcements (title, content, is_active)
values ('奶龙的小纸条', '今天也要好好吃饭哦～', true);

-- Storage：签到图私有，商品图和头像公开；文件类型与 5MB 大小由 bucket 限制。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('checkin-images', 'checkin-images', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "checkin_owner_upload" on storage.objects for insert to authenticated
with check (bucket_id = 'checkin-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "checkin_owner_or_admin_read" on storage.objects for select to authenticated
using (bucket_id = 'checkin-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "product_images_public_read" on storage.objects for select to public
using (bucket_id = 'product-images');
create policy "product_images_admin_write" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());
create policy "avatars_public_read" on storage.objects for select to public
using (bucket_id = 'avatars');
create policy "avatars_owner_upload" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
