-- v3.7 · Öğrenci profili (sınav türü, alan, sınıf, okul, hedef), bildirim kapsamı ve ders adı düzeltmesi.
-- Yalnızca ekleme yapar; mevcut tablolar ve izinler değişmez.

create table if not exists public.student_profile(
  student_id uuid primary key references public.profiles(id) on delete cascade,
  exam text not null default 'YKS' check (exam in ('YKS','LGS')),
  field text check (field is null or field in ('SAY','EA','SÖZ','DİL','TYT')),
  grade text check (grade is null or grade in ('7','8','9','10','11','12','Mezun')),
  school text check (school is null or char_length(school) <= 80),
  target text check (target is null or char_length(target) <= 120),
  updated_at timestamptz not null default now());
alter table public.student_profile enable row level security;
revoke all on public.student_profile from anon;
grant select, insert, update, delete on public.student_profile to authenticated;
drop policy if exists sp_coach_all on public.student_profile;
create policy sp_coach_all on public.student_profile for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
drop policy if exists sp_student_select on public.student_profile;
create policy sp_student_select on public.student_profile for select to authenticated
  using (student_id = (select auth.uid()));

-- Koç, hangi öğrencinin bildirimi açık olduğunu görür (abonelik anahtarlarını görmeden, yalnızca sayı).
create or replace function public.push_coverage()
returns table(student_id uuid, n int) language sql stable security definer set search_path = public as $$
  select p.student_id, count(*)::int from public.push_subs p where public.is_coach() group by p.student_id
$$;
revoke all on function public.push_coverage() from public, anon;
grant execute on function public.push_coverage() to authenticated;

-- PDF'ten büyük harfle ya da bozuk okunan ders adları (tek seferlik düzeltme).
alter table public.weekly_tasks disable trigger tasks_guard_trg;
update public.weekly_tasks set subject = case subject
  when 'KİMYA' then 'Kimya' when 'Kimya/COĞRAFYA' then 'Kimya/Coğrafya'
  when 'Fizik/TARİH' then 'Fizik/Tarih' when 'Türkçe/SOSYAL' then 'Türkçe/Sosyal' else subject end
  where subject in ('KİMYA','Kimya/COĞRAFYA','Fizik/TARİH','Türkçe/SOSYAL');
update public.weekly_tasks set subject = case when title = 'Parabol' then 'Matematik' when title = 'Deneme' then 'Deneme' else 'Diğer' end
  where subject !~ '^[A-Za-zÇĞİÖŞÜçğıöşü]';
alter table public.weekly_tasks enable trigger tasks_guard_trg;

-- Zamanlayıcı (pg_cron → call_break_nudge): uzun mola yanında 3 saati geçen açık ders oturumu varsa da break-nudge çağrılır.
create or replace function public.call_break_nudge()
 returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
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
  ) and not exists (
    select 1 from public.daily d
    where d.day >= (now() at time zone 'Europe/Istanbul')::date - 1
      and d.state->>'status' = 'study'
      and (d.state->'cur'->>'start') ~ '^[0-9]{12,14}$'
      and now_ms - (d.state->'cur'->>'start')::bigint - coalesce(nullif(d.state->'cur'->>'brk','')::numeric, 0) between 3 * 3600000 and 12 * 3600000
      and not exists (select 1 from public.break_nudges b where b.student_id = d.student_id and b.break_start = -((d.state->'cur'->>'start')::bigint))
  ) then return; end if;
  perform net.http_post(url := 'https://ramcghaefbbwgwtgtdtt.supabase.co/functions/v1/break-nudge',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.app_secrets where name = 'CRON_SECRET')),
    body := '{}'::jsonb);
end $function$;
