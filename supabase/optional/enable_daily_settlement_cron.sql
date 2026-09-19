-- Optional one-time setup in Supabase SQL Editor if pg_cron was not already enabled.
-- Confirm the project supports pg_cron before running. 14:05 UTC = 22:05 Asia/Shanghai.
create extension if not exists pg_cron with schema extensions;
select cron.schedule(
  'couple-daily-checkin-settlement',
  '5 14 * * *',
  'select public.settle_checkin_days_for_user(id) from public.profiles where role <> ''admin'''
);
select jobid, jobname, schedule, active from cron.job
where jobname = 'couple-daily-checkin-settlement';
