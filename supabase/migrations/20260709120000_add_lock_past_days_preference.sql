alter table "public"."Profiles"
  add column if not exists "lockPastDaysEnabled" boolean default true not null;
