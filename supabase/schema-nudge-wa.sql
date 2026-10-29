-- v3.4: uzun mola hatırlatması (yapay zekâ mesajı + bildirim), WhatsApp altyapısı, otomatik mesaj türü.
-- Supabase → SQL Editor'da bir kez çalıştırılır (canlı veritabanına 29.10.2026'da uygulandı).

-- 1) Mesaj türü: 'chat' (normal) / 'auto' (sistemin yapay zekâyla yazdığı). WhatsApp gönderim durumu yalnızca sunucu yazar.
alter table public.messages add column if not exists kind text not null default 'chat';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('chat','auto'));
alter table public.messages add column if not exists wa_status text;
alter table public.messages add column if not exists wa_at timestamptz;
drop policy if exists msg_student_insert on public.messages;
create policy msg_student_insert on public.messages for insert to authenticated
  with check (student_id = (select auth.uid()) and not from_coach and read_at is null and kind = 'chat' and wa_status is null);
drop policy if exists msg_coach_insert on public.messages;
create policy msg_coach_insert on public.messages for insert to authenticated
  with check ((select public.is_coach()) and from_coach and read_at is null and kind = 'chat' and wa_status is null);

-- 2) Uygulama ayarları (gizli olmayan). Koç okur/yazar; sunucu fonksiyonları servis rolüyle okur.
create table if not exists public.app_settings(
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon;
drop policy if exists set_coach_all on public.app_settings;
create policy set_coach_all on public.app_settings for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
insert into public.app_settings(key, value) values
  ('nudge', '{"on":true,"min":60,"quiet_from":0,"quiet_to":7}'),
  ('wa', '{"on":false,"chat":true,"nudge":true}')
on conflict (key) do nothing;

-- 3) Öğrenci iletişim bilgisi ve WhatsApp izni (yalnız koç görür/yazar). Numaralar ülke koduyla, yalnız rakam (905321234567).
create table if not exists public.student_contacts(
  student_id uuid primary key references public.profiles(id) on delete cascade,
  phone text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  parent_phone text check (parent_phone is null or parent_phone ~ '^[0-9]{10,15}$'),
  wa_ok boolean not null default false,
  wa_ok_at timestamptz,
  updated_at timestamptz not null default now());
alter table public.student_contacts enable row level security;
revoke all on public.student_contacts from anon;
drop policy if exists sc_coach_all on public.student_contacts;
create policy sc_coach_all on public.student_contacts for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));

-- 4) Mola hatırlatma kaydı: aynı mola için bir kez (birincil anahtar). Yalnızca sunucu yazar, koç okur.
create table if not exists public.break_nudges(
  student_id uuid not null references public.profiles(id) on delete cascade,
  break_start bigint not null,
  sent_at timestamptz not null default now(),
  message_id bigint references public.messages(id) on delete set null,
  push int not null default 0,
  wa_status text,
  primary key (student_id, break_start));
create index if not exists break_nudges_msg_idx on public.break_nudges(message_id);
create index if not exists break_nudges_sent_idx on public.break_nudges(student_id, sent_at desc);
alter table public.break_nudges enable row level security;
revoke all on public.break_nudges from anon;
drop policy if exists bn_coach_select on public.break_nudges;
create policy bn_coach_select on public.break_nudges for select to authenticated using ((select public.is_coach()));

-- 5) Zamanlayıcı: 5 dakikada bir. Fonksiyon yalnızca süresi dolmuş, henüz hatırlatılmamış bir mola varsa çağrılır.
create or replace function public.call_break_nudge() returns void
language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare s jsonb; m int; h int; qf int; qt int; now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select value into s from public.app_settings where key = 'nudge';
  if s is not null and coalesce((s->>'on')::boolean, true) is false then return; end if;
  m := greatest(15, least(240, coalesce((s->>'min')::int, 60)));
  h := extract(hour from (now() at time zone 'Europe/Istanbul'))::int;
  qf := coalesce((s->>'quiet_from')::int, 0); qt := coalesce((s->>'quiet_to')::int, 7);
  if (qf < qt and h >= qf and h < qt) or (qf > qt and (h >= qf or h < qt)) then return; end if;
  if not exists (
    select 1 from public.daily d
    where d.day >= (now() at time zone 'Europe/Istanbul')::date - 1
      and d.state->>'status' = 'break'
      and (d.state->'cur'->>'bs') ~ '^[0-9]{12,14}$'
      and now_ms - (d.state->'cur'->>'bs')::bigint between m * 60000 and 6 * 3600000
      and not exists (select 1 from public.break_nudges b where b.student_id = d.student_id and b.break_start = (d.state->'cur'->>'bs')::bigint)
  ) then return; end if;
  perform net.http_post(url := 'https://ramcghaefbbwgwtgtdtt.supabase.co/functions/v1/break-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.app_secrets where name = 'CRON_SECRET')),
    body := '{}'::jsonb);
end $$;
revoke all on function public.call_break_nudge() from public, anon, authenticated;
select cron.schedule('break-nudge', '*/5 * * * *', 'select public.call_break_nudge()');

-- 6) WhatsApp: koç mesajı eklenince (WhatsApp açık ve öğrencinin izni varsa) wa-send fonksiyonu arka planda çağrılır.
create or replace function public.msg_wa_hook() returns trigger
language plpgsql security definer set search_path to 'public', 'extensions' as $$
begin
  if new.from_coach
     and coalesce((select (value->>'on')::boolean from public.app_settings where key = 'wa'), false)
     and exists (select 1 from public.student_contacts c where c.student_id = new.student_id and c.wa_ok and c.phone is not null) then
    perform net.http_post(url := 'https://ramcghaefbbwgwtgtdtt.supabase.co/functions/v1/wa-send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.app_secrets where name = 'CRON_SECRET')),
      body := jsonb_build_object('message_id', new.id));
  end if;
  return null;
end $$;
revoke all on function public.msg_wa_hook() from public, anon, authenticated;
drop trigger if exists messages_wa on public.messages;
create trigger messages_wa after insert on public.messages for each row execute function public.msg_wa_hook();
