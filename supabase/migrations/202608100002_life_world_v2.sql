-- Jj 的快乐小屋 V2：情侣生活记录、互动、愿望、惊喜、成就与足迹。
-- 仅做增量扩展；所有北京时间日期统一使用 Asia/Shanghai。

do $$ begin
  create type public.mood_value as enum (
    'very_unpleasant', 'unpleasant', 'slightly_unpleasant', 'neutral',
    'slightly_pleasant', 'pleasant', 'very_pleasant'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.event_repeat_type as enum ('none', 'yearly');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.wish_category as enum ('food', 'travel', 'gift', 'activity', 'movie', 'other');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.wish_status as enum ('active', 'completed', 'archived');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.product_type as enum ('normal', 'mystery');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.mystery_order_status as enum ('preparing', 'ready', 'revealed');
exception when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists product_type public.product_type not null default 'normal',
  add column if not exists mystery_hint text not null default '' check (char_length(mystery_hint) <= 300);

alter table public.orders
  add column if not exists mystery_status public.mystery_order_status,
  add column if not exists revealed_at timestamptz;

-- 兼容已经上线的项目：再次在数据库入口强制执行两个签到时间窗。
create or replace function public.enforce_checkin_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_local_time time := (now() at time zone 'Asia/Shanghai')::time;
begin
  if new.type = 'lunch' and not (v_local_time >= time '11:00' and v_local_time < time '13:00') then
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
set label = '午间限时签到奖励', description = '每天 11:00–13:00 完成照片签到后发放'
where key = 'lunch_reward';
update public.system_settings
set label = '晚间限时签到奖励', description = '每天 16:00–22:00 完成照片签到后发放'
where key = 'dinner_reward';
update public.system_settings
set description = '同一天午间和晚间限时签到都完成后发放'
where key = 'daily_complete_reward';

create table if not exists public.relationship_settings (
  id boolean primary key default true check (id),
  title text not null default '我们认识' check (char_length(title) between 1 and 30),
  start_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_date date not null,
  value public.mood_value not null,
  tags text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mood_date)
);

create table if not exists public.mood_responses (
  id uuid primary key default gen_random_uuid(),
  mood_id uuid not null unique references public.moods(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  coin_reward integer not null default 0 check (coin_reward >= 0),
  reward_transaction_id uuid unique references public.wallet_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_date date not null,
  content text not null check (char_length(content) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, note_date)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  event_date date not null,
  event_type text not null default 'special' check (char_length(event_type) between 1 and 30),
  note text not null default '' check (char_length(note) <= 800),
  repeat_type public.event_repeat_type not null default 'none',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 800),
  category public.wish_category not null default 'other',
  status public.wish_status not null default 'active',
  image_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 该表仅允许管理员读取；普通用户不能通过客户端查询秘密准备状态。
create table if not exists public.wish_admin_meta (
  wish_id uuid primary key references public.wishes(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'preparing', 'ready')),
  secret_note text not null default '' check (char_length(secret_note) <= 800),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict
);

-- 商品真实惊喜内容与公开商品字段物理隔离。
create table if not exists public.product_mystery_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  surprise_title text not null check (char_length(surprise_title) between 1 and 100),
  surprise_content text not null check (char_length(surprise_content) between 1 and 1000),
  reveal_image_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict
);

-- 订单惊喜详情只有管理员和已经主动揭晓的订单所有者可读。
create table if not exists public.order_mystery_details (
  order_id uuid primary key references public.orders(id) on delete cascade,
  surprise_title text not null check (char_length(surprise_title) between 1 and 100),
  surprise_content text not null check (char_length(surprise_content) between 1 and 1000),
  reveal_image_url text,
  admin_message text not null default '' check (char_length(admin_message) <= 800),
  prepared_at timestamptz not null default now(),
  prepared_by uuid not null references public.profiles(id) on delete restrict,
  revealed_at timestamptz
);

create table if not exists public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default 'badge',
  metric text not null,
  target integer not null check (target > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  place_name text not null check (char_length(place_name) between 1 and 120),
  visit_date date not null,
  description text not null default '' check (char_length(description) <= 1000),
  image_url text,
  place_type text not null default 'other' check (char_length(place_type) between 1 and 30),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moods_user_date_idx on public.moods (user_id, mood_date desc);
create index if not exists calendar_events_date_idx on public.calendar_events (event_date, repeat_type);
create index if not exists wishes_user_status_idx on public.wishes (user_id, status, created_at desc);
create index if not exists places_visit_date_idx on public.places (visit_date desc);
create index if not exists achievements_user_idx on public.user_achievements (user_id, unlocked_at desc);

drop trigger if exists relationship_settings_touch on public.relationship_settings;
create trigger relationship_settings_touch before update on public.relationship_settings
for each row execute function public.touch_updated_at();
drop trigger if exists moods_touch on public.moods;
create trigger moods_touch before update on public.moods
for each row execute function public.touch_updated_at();
drop trigger if exists mood_responses_touch on public.mood_responses;
create trigger mood_responses_touch before update on public.mood_responses
for each row execute function public.touch_updated_at();
drop trigger if exists daily_notes_touch on public.daily_notes;
create trigger daily_notes_touch before update on public.daily_notes
for each row execute function public.touch_updated_at();
drop trigger if exists calendar_events_touch on public.calendar_events;
create trigger calendar_events_touch before update on public.calendar_events
for each row execute function public.touch_updated_at();
drop trigger if exists wishes_touch on public.wishes;
create trigger wishes_touch before update on public.wishes
for each row execute function public.touch_updated_at();
drop trigger if exists wish_admin_meta_touch on public.wish_admin_meta;
create trigger wish_admin_meta_touch before update on public.wish_admin_meta
for each row execute function public.touch_updated_at();
drop trigger if exists product_mystery_details_touch on public.product_mystery_details;
create trigger product_mystery_details_touch before update on public.product_mystery_details
for each row execute function public.touch_updated_at();
drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places
for each row execute function public.touch_updated_at();

insert into public.relationship_settings (id, title, start_date)
values (true, '我们认识', null)
on conflict (id) do nothing;

insert into public.system_settings (key, value, label, description) values
  ('mood_checkin_reward', 1, '每日心情奖励', '北京时间当天首次记录心情时发放；修改、删除后重建或重复请求均不重复发放')
on conflict (key) do nothing;

insert into public.achievement_definitions (code, title, description, icon, metric, target, sort_order) values
  ('meal_streak_3', '好好吃饭新人', '连续完整签到 3 天', 'utensils', 'meal_streak', 3, 10),
  ('meal_streak_30', '认真吃饭大师', '连续完整签到 30 天', 'flame', 'meal_streak', 30, 20),
  ('moods_30', '心情收藏家', '累计记录 30 天心情', 'heart', 'mood_days', 30, 30),
  ('coins_1000', '奶龙小富婆', '累计获得 1000 奶龙币', 'coins', 'coins_earned', 1000, 40),
  ('orders_10', '兑换达人', '累计完成 10 次兑换', 'gift', 'orders_completed', 10, 50),
  ('events_20', '回忆制造机', '累计记录 20 个特殊日期', 'calendar', 'calendar_events', 20, 60),
  ('moods_100', '心情满满', '累计记录 100 天心情', 'sparkles', 'mood_days', 100, 70),
  ('wishes_10', '愿望实现家', '累计实现 10 个愿望', 'star', 'wishes_completed', 10, 80)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  metric = excluded.metric,
  target = excluded.target,
  sort_order = excluded.sort_order;

create or replace function public.save_mood(
  p_mood_date date,
  p_value public.mood_value,
  p_tags text[] default '{}',
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_mood_id uuid;
  v_reward integer := 0;
  v_rewarded boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mood_date is null or p_mood_date > v_today then raise exception 'INVALID_MOOD_DATE'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'MOOD_NOTE_TOO_LONG'; end if;
  if coalesce(array_length(p_tags, 1), 0) > 8 then raise exception 'TOO_MANY_MOOD_TAGS'; end if;

  insert into public.moods (user_id, mood_date, value, tags, note)
  values (v_user, p_mood_date, p_value, coalesce(p_tags, '{}'), trim(coalesce(p_note, '')))
  on conflict (user_id, mood_date) do update set
    value = excluded.value,
    tags = excluded.tags,
    note = excluded.note
  returning id into v_mood_id;

  if p_mood_date = v_today then
    select value into v_reward from public.system_settings where key = 'mood_checkin_reward';
    v_reward := coalesce(v_reward, 1);
    insert into public.reward_claims (user_id, reward_type, reward_date, amount)
    values (v_user, 'mood_checkin', p_mood_date, v_reward)
    on conflict (user_id, reward_type, reward_date) do nothing;
    if found then
      v_rewarded := true;
      if v_reward > 0 then
        perform public.perform_wallet_change(
          v_user, v_reward, 0, 'income', 'mood_checkin_reward',
          '今日心情打卡', null, null, v_user, v_mood_id::text
        );
      end if;
    end if;
  end if;

  return jsonb_build_object('mood_id', v_mood_id, 'rewarded', v_rewarded, 'reward', case when v_rewarded then v_reward else 0 end);
end;
$$;

create or replace function public.respond_to_mood(
  p_mood_id uuid,
  p_content text,
  p_coin_reward integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_mood public.moods%rowtype;
  v_response public.mood_responses%rowtype;
  v_response_id uuid;
  v_transaction_id uuid;
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(trim(coalesce(p_content, ''))) not between 1 and 300 then raise exception 'INVALID_RESPONSE'; end if;
  if p_coin_reward < 0 or p_coin_reward > 100000 then raise exception 'INVALID_REWARD'; end if;
  select * into v_mood from public.moods where id = p_mood_id for update;
  if not found then raise exception 'MOOD_NOT_FOUND'; end if;
  select * into v_response from public.mood_responses where mood_id = p_mood_id for update;

  if found then
    if v_response.reward_transaction_id is not null and p_coin_reward <> v_response.coin_reward then
      raise exception 'RESPONSE_REWARD_IMMUTABLE';
    end if;
    if v_response.reward_transaction_id is null and v_response.coin_reward = 0 and p_coin_reward > 0 then
      v_transaction_id := public.perform_wallet_change(
        v_mood.user_id, p_coin_reward, 0, 'income', 'mood_response_reward',
        '心情回应奖励', null, null, v_admin, v_response.id::text
      );
    else
      v_transaction_id := v_response.reward_transaction_id;
    end if;
    update public.mood_responses set
      content = trim(p_content),
      coin_reward = case when reward_transaction_id is null then p_coin_reward else coin_reward end,
      reward_transaction_id = coalesce(reward_transaction_id, v_transaction_id)
    where id = v_response.id returning id into v_response_id;
  else
    insert into public.mood_responses (mood_id, from_user_id, to_user_id, content, coin_reward)
    values (p_mood_id, v_admin, v_mood.user_id, trim(p_content), p_coin_reward)
    returning id into v_response_id;
    if p_coin_reward > 0 then
      v_transaction_id := public.perform_wallet_change(
        v_mood.user_id, p_coin_reward, 0, 'income', 'mood_response_reward',
        '心情回应奖励', null, null, v_admin, v_response_id::text
      );
      update public.mood_responses set reward_transaction_id = v_transaction_id where id = v_response_id;
    end if;
  end if;
  return v_response_id;
end;
$$;

-- 保留原订单原子逻辑，仅为惊喜箱订单写入 preparing 状态。
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
    insert into public.orders (
      user_id, product_id, product_name_snapshot, price_snapshot, request_id, mystery_status
    ) values (
      v_user, v_product.id, v_product.name, v_product.price, p_request_id,
      case when v_product.product_type = 'mystery' then 'preparing'::public.mystery_order_status else null end
    ) returning id into v_order_id;
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

create or replace function public.prepare_mystery_order(
  p_order_id uuid,
  p_surprise_title text,
  p_surprise_content text,
  p_admin_message text default '',
  p_reveal_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  select o.* into v_order
  from public.orders o join public.products p on p.id = o.product_id
  where o.id = p_order_id and p.product_type = 'mystery'
  for update of o;
  if not found then raise exception 'MYSTERY_ORDER_NOT_FOUND'; end if;
  if v_order.revealed_at is not null then raise exception 'MYSTERY_ALREADY_REVEALED'; end if;
  if char_length(trim(coalesce(p_surprise_title, ''))) not between 1 and 100 then raise exception 'INVALID_SURPRISE'; end if;
  if char_length(trim(coalesce(p_surprise_content, ''))) not between 1 and 1000 then raise exception 'INVALID_SURPRISE'; end if;

  insert into public.order_mystery_details (
    order_id, surprise_title, surprise_content, reveal_image_url, admin_message, prepared_by
  ) values (
    p_order_id, trim(p_surprise_title), trim(p_surprise_content), p_reveal_image_url,
    trim(coalesce(p_admin_message, '')), v_admin
  )
  on conflict (order_id) do update set
    surprise_title = excluded.surprise_title,
    surprise_content = excluded.surprise_content,
    reveal_image_url = excluded.reveal_image_url,
    admin_message = excluded.admin_message,
    prepared_at = now(),
    prepared_by = excluded.prepared_by;
  update public.orders set mystery_status = 'ready' where id = p_order_id;
end;
$$;

create or replace function public.reveal_mystery_order(p_order_id uuid)
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
  if v_order.mystery_status = 'revealed' then return; end if;
  if v_order.mystery_status <> 'ready' then raise exception 'MYSTERY_NOT_READY'; end if;
  update public.order_mystery_details set revealed_at = now() where order_id = p_order_id;
  if not found then raise exception 'MYSTERY_NOT_READY'; end if;
  update public.orders set mystery_status = 'revealed', revealed_at = now() where id = p_order_id;
end;
$$;

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
    select count(distinct type) = 2 into v_complete from public.checkins where user_id = v_user and checkin_date = v_day;
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

-- 扩展管理员奖励设置白名单，继续通过原原子函数更新。
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
  v_allowed constant text[] := array[
    'lunch_reward', 'dinner_reward', 'daily_complete_reward',
    'streak_7_reward', 'streak_30_reward', 'mood_checkin_reward'
  ];
begin
  if not public.is_admin(v_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  foreach v_key in array v_allowed loop
    if not (p_settings ? v_key) then raise exception 'SETTING_MISSING'; end if;
    begin v_value := (p_settings ->> v_key)::integer;
    exception when others then raise exception 'INVALID_SETTING_VALUE'; end;
    if v_value < 0 then raise exception 'INVALID_SETTING_VALUE'; end if;
    update public.system_settings set value = v_value, updated_by = v_admin where key = v_key;
    if not found then raise exception 'SETTING_MISSING'; end if;
  end loop;
  insert into public.admin_logs (operator_id, action, target_type, details)
  values (v_admin, 'settings_update', 'system_settings', p_settings);
end;
$$;

alter table public.relationship_settings enable row level security;
alter table public.moods enable row level security;
alter table public.mood_responses enable row level security;
alter table public.daily_notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.wishes enable row level security;
alter table public.wish_admin_meta enable row level security;
alter table public.product_mystery_details enable row level security;
alter table public.order_mystery_details enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.places enable row level security;

create policy "relationship_authenticated_read" on public.relationship_settings for select to authenticated using (true);
create policy "relationship_admin_insert" on public.relationship_settings for insert to authenticated with check (public.is_admin());
create policy "relationship_admin_update" on public.relationship_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "moods_read_own_or_admin" on public.moods for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "moods_delete_own_or_admin" on public.moods for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "mood_responses_read_recipient_or_admin" on public.mood_responses for select to authenticated using (to_user_id = auth.uid() or public.is_admin());

create policy "daily_notes_read_own_or_admin" on public.daily_notes for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "daily_notes_insert_own" on public.daily_notes for insert to authenticated with check (user_id = auth.uid());
create policy "daily_notes_update_own" on public.daily_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "daily_notes_delete_own" on public.daily_notes for delete to authenticated using (user_id = auth.uid());

create policy "calendar_events_authenticated_read" on public.calendar_events for select to authenticated using (true);
create policy "calendar_events_insert_own" on public.calendar_events for insert to authenticated with check (created_by = auth.uid());
create policy "calendar_events_update_owner_or_admin" on public.calendar_events for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "calendar_events_delete_owner_or_admin" on public.calendar_events for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "wishes_read_own_or_admin" on public.wishes for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "wishes_insert_own_or_admin" on public.wishes for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "wishes_update_own_or_admin" on public.wishes for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "wishes_delete_own_or_admin" on public.wishes for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "wish_admin_meta_admin_all" on public.wish_admin_meta for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "product_mystery_details_admin_all" on public.product_mystery_details for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order_mystery_admin_read" on public.order_mystery_details for select to authenticated using (public.is_admin());
create policy "order_mystery_owner_read_after_reveal" on public.order_mystery_details for select to authenticated
using (revealed_at is not null and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "achievement_definitions_read" on public.achievement_definitions for select to authenticated using (is_active or public.is_admin());
create policy "user_achievements_read_own_or_admin" on public.user_achievements for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "places_authenticated_read" on public.places for select to authenticated using (true);
create policy "places_insert_own" on public.places for insert to authenticated with check (created_by = auth.uid());
create policy "places_update_owner_or_admin" on public.places for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "places_delete_owner_or_admin" on public.places for delete to authenticated using (created_by = auth.uid() or public.is_admin());

revoke all on function public.save_mood(date, public.mood_value, text[], text) from public, anon;
revoke all on function public.respond_to_mood(uuid, text, integer) from public, anon;
revoke all on function public.prepare_mystery_order(uuid, text, text, text, text) from public, anon;
revoke all on function public.reveal_mystery_order(uuid) from public, anon;
revoke all on function public.refresh_achievements(uuid) from public, anon;
grant execute on function public.save_mood(date, public.mood_value, text[], text) to authenticated;
grant execute on function public.respond_to_mood(uuid, text, integer) to authenticated;
grant execute on function public.prepare_mystery_order(uuid, text, text, text, text) to authenticated;
grant execute on function public.reveal_mystery_order(uuid) to authenticated;
grant execute on function public.refresh_achievements(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('life-images', 'life-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "life_images_owner_upload" on storage.objects for insert to authenticated
with check (bucket_id = 'life-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "life_images_authenticated_read" on storage.objects for select to authenticated
using (bucket_id = 'life-images');
create policy "life_images_owner_or_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'life-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "life_images_owner_or_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'life-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
