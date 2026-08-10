begin;

alter table public.memory_photos
  add column if not exists deleted_at timestamptz;
alter table public.places
  add column if not exists deleted_at timestamptz;

create index if not exists memory_photos_active_date_idx
  on public.memory_photos (photo_date desc, created_at desc)
  where deleted_at is null;
create index if not exists memory_photos_deleted_idx
  on public.memory_photos (deleted_at desc)
  where deleted_at is not null;
create index if not exists places_active_visit_date_idx
  on public.places (visit_date desc)
  where deleted_at is null;
create index if not exists places_deleted_idx
  on public.places (deleted_at desc)
  where deleted_at is not null;

drop policy if exists "memory_photos_admin_update" on public.memory_photos;
create policy "memory_photos_admin_update" on public.memory_photos
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "memory_photos_admin_delete" on public.memory_photos;
create policy "memory_photos_admin_delete" on public.memory_photos
for delete to authenticated using (public.is_admin());

create or replace function public.enforce_memory_photo_daily_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is null and (
    select count(*)
    from public.memory_photos photo
    where photo.user_id = new.user_id
      and photo.photo_date = new.photo_date
      and photo.deleted_at is null
      and photo.id <> new.id
  ) >= 9 then
    raise exception 'MEMORY_PHOTO_DAILY_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists memory_photos_daily_limit on public.memory_photos;
create trigger memory_photos_daily_limit
before insert or update of user_id, photo_date, deleted_at on public.memory_photos
for each row execute function public.enforce_memory_photo_daily_limit();

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_admin_delete" on storage.objects;
create policy "avatars_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and public.is_admin());
drop policy if exists "checkin_images_admin_delete" on storage.objects;
create policy "checkin_images_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'checkin-images' and public.is_admin());

insert into public.system_settings (key, value, label, description)
values ('warning_storage_mb', 800, '存储容量提醒阈值', '管理员存储页使用的容量提醒阈值（MB）')
on conflict (key) do nothing;

commit;
