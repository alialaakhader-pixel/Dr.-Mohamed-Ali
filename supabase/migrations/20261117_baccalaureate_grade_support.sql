alter table public.ha_codes
  drop constraint if exists ha_codes_grade_check;
alter table public.ha_codes
  add constraint ha_codes_grade_check
  check (grade = any (array['1ث','2ث','3ث','بكالوريا','جميع الصفوف']::text[]));

alter table public.ha_accounts
  drop constraint if exists ha_accounts_grade_check;
alter table public.ha_accounts
  add constraint ha_accounts_grade_check
  check (grade = any (array['1ث','2ث','3ث','بكالوريا','جميع الصفوف']::text[]));
