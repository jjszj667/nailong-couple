begin;

alter table public.relationship_settings
  add column if not exists partner_a_id uuid,
  add column if not exists partner_b_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'relationship_partner_a_fk') then
    alter table public.relationship_settings
      add constraint relationship_partner_a_fk foreign key (partner_a_id) references public.profiles(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'relationship_partner_b_fk') then
    alter table public.relationship_settings
      add constraint relationship_partner_b_fk foreign key (partner_b_id) references public.profiles(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'relationship_partners_distinct') then
    alter table public.relationship_settings
      add constraint relationship_partners_distinct check (
        partner_a_id is null or partner_b_id is null or partner_a_id <> partner_b_id
      );
  end if;
end
$$;

-- Existing two-person projects are filled automatically; the admin can adjust this later.
update public.relationship_settings
set
  partner_a_id = coalesce(
    partner_a_id,
    (select id from public.profiles where role = 'admin' order by created_at asc limit 1)
  ),
  partner_b_id = coalesce(
    partner_b_id,
    (select id from public.profiles where role = 'user' order by created_at asc limit 1)
  )
where id = true;

-- Keep profile details private, but let the two configured partners read each
-- other's nickname/avatar for natural front-end copy.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_read_relationship_partner'
  ) then
    execute $policy$
      create policy "profiles_read_relationship_partner"
      on public.profiles for select to authenticated
      using (
        exists (
          select 1
          from public.relationship_settings relationship
          where relationship.id = true
            and (
              (relationship.partner_a_id = auth.uid() and relationship.partner_b_id = profiles.id)
              or
              (relationship.partner_b_id = auth.uid() and relationship.partner_a_id = profiles.id)
            )
        )
      )
    $policy$;
  end if;
end
$$;

create or replace function public.get_home_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with clock as (
    select (now() at time zone 'Asia/Shanghai')::date as today
  )
  select jsonb_build_object(
    'profile', (select to_jsonb(profile_row) from public.profiles profile_row where profile_row.id = auth.uid()),
    'wallet', (select to_jsonb(wallet_row) from public.wallet_balances wallet_row where wallet_row.user_id = auth.uid()),
    'checkins', coalesce((
      select jsonb_agg(to_jsonb(checkin_row) order by checkin_row.created_at)
      from public.checkins checkin_row, clock
      where checkin_row.user_id = auth.uid() and checkin_row.checkin_date = clock.today
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(to_jsonb(product_row) order by product_row.price)
      from (
        select * from public.products
        where is_featured = true and is_hidden = false and status <> 'inactive'
        order by price limit 4
      ) product_row
    ), '[]'::jsonb),
    'announcement', (
      select to_jsonb(announcement_row)
      from public.announcements announcement_row
      where announcement_row.is_active = true
      order by announcement_row.created_at desc limit 1
    ),
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(transaction_row) order by transaction_row.created_at desc)
      from (
        select * from public.wallet_transactions
        where user_id = auth.uid()
        order by created_at desc limit 5
      ) transaction_row
    ), '[]'::jsonb),
    'today_transactions', coalesce((
      select jsonb_agg(to_jsonb(transaction_row) order by transaction_row.created_at desc)
      from public.wallet_transactions transaction_row, clock
      where transaction_row.user_id = auth.uid()
        and transaction_row.created_at >= clock.today::timestamp at time zone 'Asia/Shanghai'
        and transaction_row.created_at < (clock.today + 1)::timestamp at time zone 'Asia/Shanghai'
    ), '[]'::jsonb),
    'moods', coalesce((
      select jsonb_agg(to_jsonb(mood_row) order by mood_row.mood_date)
      from public.moods mood_row, clock
      where mood_row.user_id = auth.uid()
        and mood_row.mood_date between clock.today - 6 and clock.today
    ), '[]'::jsonb),
    'mood_response', (
      select to_jsonb(response_row)
      from public.mood_responses response_row
      join public.moods mood_row on mood_row.id = response_row.mood_id
      join clock on true
      where mood_row.user_id = auth.uid() and mood_row.mood_date = clock.today
      limit 1
    ),
    'daily_note', (
      select to_jsonb(note_row)
      from public.daily_notes note_row, clock
      where note_row.user_id = auth.uid() and note_row.note_date = clock.today
      limit 1
    ),
    'relationship', (
      select to_jsonb(relationship_row)
      from public.relationship_settings relationship_row
      where relationship_row.id = true
    ),
    'events', coalesce((
      select jsonb_agg(to_jsonb(event_row) order by event_row.event_date)
      from (
        select * from public.calendar_events order by event_date limit 500
      ) event_row
    ), '[]'::jsonb),
    'wishes', coalesce((
      select jsonb_agg(to_jsonb(wish_row) order by wish_row.created_at desc)
      from (
        select * from public.wishes
        where user_id = auth.uid() and status = 'active'
        order by created_at desc limit 3
      ) wish_row
    ), '[]'::jsonb),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(profile_row) order by profile_row.created_at)
      from public.profiles profile_row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_home_dashboard() from public, anon;
grant execute on function public.get_home_dashboard() to authenticated;

commit;
