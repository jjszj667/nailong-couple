begin;

alter table public.calendar_events
  add column if not exists is_story_event boolean not null default false;

create index if not exists calendar_events_story_date_idx
  on public.calendar_events (event_date desc)
  where is_story_event = true;

create table if not exists public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_date date not null,
  image_url text not null,
  caption text not null default '' check (char_length(caption) <= 240),
  category text not null default 'daily' check (
    category in ('daily', 'date', 'travel', 'food', 'gift', 'selfie', 'scenery', 'special', 'other')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_photos_date_idx
  on public.memory_photos (photo_date desc, created_at desc);
create index if not exists memory_photos_user_date_idx
  on public.memory_photos (user_id, photo_date desc);

drop trigger if exists memory_photos_touch on public.memory_photos;
create trigger memory_photos_touch before update on public.memory_photos
for each row execute function public.touch_updated_at();

create or replace function public.enforce_memory_photo_daily_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.memory_photos photo
    where photo.user_id = new.user_id
      and photo.photo_date = new.photo_date
      and photo.id <> new.id
  ) >= 9 then
    raise exception 'MEMORY_PHOTO_DAILY_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists memory_photos_daily_limit on public.memory_photos;
create trigger memory_photos_daily_limit
before insert or update of user_id, photo_date on public.memory_photos
for each row execute function public.enforce_memory_photo_daily_limit();

alter table public.memory_photos enable row level security;

-- The configured couple can read each other's life records. Write policies stay
-- owner-only, so shared viewing never grants permission to edit a partner's data.
drop policy if exists "moods_read_relationship_partner" on public.moods;
create policy "moods_read_relationship_partner" on public.moods
for select to authenticated using (
  exists (
    select 1 from public.relationship_settings relationship
    where relationship.id = true
      and (
        (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = moods.user_id)
        or
        (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = moods.user_id)
      )
  )
);

drop policy if exists "daily_notes_read_relationship_partner" on public.daily_notes;
create policy "daily_notes_read_relationship_partner" on public.daily_notes
for select to authenticated using (
  exists (
    select 1 from public.relationship_settings relationship
    where relationship.id = true
      and (
        (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = daily_notes.user_id)
        or
        (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = daily_notes.user_id)
      )
  )
);

drop policy if exists "checkins_read_relationship_partner" on public.checkins;
create policy "checkins_read_relationship_partner" on public.checkins
for select to authenticated using (
  exists (
    select 1 from public.relationship_settings relationship
    where relationship.id = true
      and (
        (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = checkins.user_id)
        or
        (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = checkins.user_id)
      )
  )
);

drop policy if exists "wishes_read_relationship_partner" on public.wishes;
create policy "wishes_read_relationship_partner" on public.wishes
for select to authenticated using (
  exists (
    select 1 from public.relationship_settings relationship
    where relationship.id = true
      and (
        (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = wishes.user_id)
        or
        (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = wishes.user_id)
      )
  )
);

drop policy if exists "memory_photos_read_couple" on public.memory_photos;
create policy "memory_photos_read_couple" on public.memory_photos
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.relationship_settings relationship
    where relationship.id = true
      and (
        (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = memory_photos.user_id)
        or
        (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = memory_photos.user_id)
      )
  )
);
drop policy if exists "memory_photos_insert_own" on public.memory_photos;
create policy "memory_photos_insert_own" on public.memory_photos
for insert to authenticated with check (
  user_id = auth.uid()
  and split_part(image_url, '/', 1) = auth.uid()::text
);
drop policy if exists "memory_photos_update_own" on public.memory_photos;
create policy "memory_photos_update_own" on public.memory_photos
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid() and split_part(image_url, '/', 1) = auth.uid()::text);
drop policy if exists "memory_photos_delete_own" on public.memory_photos;
create policy "memory_photos_delete_own" on public.memory_photos
for delete to authenticated using (user_id = auth.uid());

-- Both partners may record a mood, but only the reward-side `user` role earns
-- the existing first-mood-of-the-day coin reward. Historical edits remain free.
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
  v_role public.user_role;
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_mood_id uuid;
  v_reward integer := 0;
  v_rewarded boolean := false;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role from public.profiles where id = v_user;
  if v_role is null then raise exception 'PROFILE_REQUIRED'; end if;
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

  if p_mood_date = v_today and v_role = 'user' then
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

  return jsonb_build_object(
    'mood_id', v_mood_id,
    'rewarded', v_rewarded,
    'reward', case when v_rewarded then v_reward else 0 end
  );
end;
$$;

create or replace function public.get_couple_home_extras()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with clock as (
    select (now() at time zone 'Asia/Shanghai')::date as today
  ), relationship as (
    select partner_a_id, partner_b_id
    from public.relationship_settings
    where id = true
  ), members as (
    select auth.uid() as user_id
    union
    select partner_a_id from relationship where partner_a_id is not null
    union
    select partner_b_id from relationship where partner_b_id is not null
  )
  select jsonb_build_object(
    'couple_moods', coalesce((
      select jsonb_agg(to_jsonb(mood_row) order by mood_row.created_at)
      from public.moods mood_row, clock
      where mood_row.user_id in (select user_id from members)
        and mood_row.mood_date = clock.today
    ), '[]'::jsonb),
    'couple_notes', coalesce((
      select jsonb_agg(to_jsonb(note_row) order by note_row.created_at)
      from public.daily_notes note_row, clock
      where note_row.user_id in (select user_id from members)
        and note_row.note_date = clock.today
    ), '[]'::jsonb),
    'couple_checkins', coalesce((
      select jsonb_agg(to_jsonb(checkin_row) order by checkin_row.created_at)
      from public.checkins checkin_row, clock
      where checkin_row.user_id in (select user_id from members)
        and checkin_row.checkin_date = clock.today
    ), '[]'::jsonb),
    'goal_products', coalesce((
      select jsonb_agg(to_jsonb(product_row) order by product_row.price)
      from public.products product_row
      where product_row.status = 'active'
        and product_row.is_hidden = false
        and product_row.stock > 0
    ), '[]'::jsonb),
    'memory_candidates', coalesce((
      select jsonb_agg(to_jsonb(memory_row) order by memory_row.memory_date desc)
      from (
        select * from (
          select photo.id::text, photo.photo_date as memory_date, 'photo'::text as kind,
            coalesce(nullif(photo.caption, ''), '那天留下了一张生活照片') as title,
            photo.caption as body, photo.image_url, photo.user_id
          from public.memory_photos photo, clock
          where photo.user_id in (select user_id from members)
            and photo.photo_date <= clock.today - 30
          union all
          select note.id::text, note.note_date, 'note', '那天留下的一句话',
            note.content, null::text, note.user_id
          from public.daily_notes note, clock
          where note.user_id in (select user_id from members)
            and note.note_date <= clock.today - 30
          union all
          select mood.id::text, mood.mood_date, 'mood', '那天的心情',
            mood.note, null::text, mood.user_id
          from public.moods mood, clock
          where mood.user_id in (select user_id from members)
            and mood.mood_date <= clock.today - 30
          union all
          select event.id::text, event.event_date, 'event', event.title,
            event.note, null::text, event.created_by
          from public.calendar_events event, clock
          where event.event_date <= clock.today - 30
          union all
          select place.id::text, place.visit_date, 'place', place.title,
            place.description, place.image_url, place.created_by
          from public.places place, clock
          where place.visit_date <= clock.today - 30
        ) candidates
        order by memory_date desc
        limit 240
      ) memory_row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_couple_home_extras() from public, anon;
grant execute on function public.get_couple_home_extras() to authenticated;

commit;
