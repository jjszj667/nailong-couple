begin;

-- Keep the existing homepage notes unchanged; releases have a separate lifecycle.
create table public.release_announcements (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (char_length(version) between 1 and 40),
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 5000),
  status text not null default 'draft' check (status in ('draft','published','disabled','closed')),
  is_forced boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint release_published_date check (status <> 'published' or published_at is not null)
);
create index release_announcements_public_idx
  on public.release_announcements(status, published_at desc);
create trigger release_announcements_touch before update on public.release_announcements
  for each row execute function public.touch_updated_at();
create or replace function public.guard_release_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.published_at is not null and new.version <> old.version then
    raise exception 'PUBLISHED_VERSION_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger release_version_immutable before update on public.release_announcements
  for each row execute function public.guard_release_version();
revoke all on function public.guard_release_version() from public, anon, authenticated;

create table public.release_announcement_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid not null references public.release_announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
create index release_reads_announcement_idx on public.release_announcement_reads(announcement_id);
alter table public.release_announcements enable row level security;
alter table public.release_announcement_reads enable row level security;
create policy release_public_read on public.release_announcements
  for select to authenticated using ((status = 'published' and published_at <= now()) or public.is_admin());
create policy release_admin_insert on public.release_announcements
  for insert to authenticated with check (public.is_admin());
create policy release_admin_update on public.release_announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy release_reads_own_select on public.release_announcement_reads
  for select to authenticated using (user_id = auth.uid());

-- Read receipts cannot be forged for other users or for inactive releases.
create or replace function public.acknowledge_release(p_announcement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.release_announcements
    where id = p_announcement_id and status = 'published'
      and published_at <= now()) then raise exception 'RELEASE_NOT_AVAILABLE'; end if;
  insert into public.release_announcement_reads(user_id, announcement_id)
  values (auth.uid(), p_announcement_id) on conflict do nothing;
end;
$$;
revoke all on function public.acknowledge_release(uuid) from public, anon;
grant execute on function public.acknowledge_release(uuid) to authenticated;

commit;
