-- Yapay zekâ modülü şeması (schema.sql çalıştırıldıktan SONRA bir kez çalıştırın)

create table public.exam_results (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_name text not null check (char_length(exam_name) <= 120),
  exam_date date,
  exam_type text not null check (exam_type in ('TYT','AYT','LGS','BRANS')),
  total_net numeric,
  score numeric,
  rank text check (char_length(rank) <= 60),
  subjects jsonb not null default '[]',
  topics jsonb not null default '[]',
  source text not null default 'ai_image' check (source in ('ai_image','manual')),
  verified boolean not null default true,
  extraction_meta jsonb,
  created_at timestamptz not null default now()
);
create index exam_results_student_idx on public.exam_results(student_id, exam_date);

create table public.ai_reports (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  exam_count int not null,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  kind text not null,
  n int not null default 0,
  primary key (student_id, day, kind)
);

alter table public.exam_results enable row level security;
alter table public.ai_reports   enable row level security;
alter table public.ai_usage     enable row level security;

-- Deneme sonuçları: öğrenci kendi sonucunu ekler/okur, koç hepsini okur ve silebilir
create policy "exam_student_select" on public.exam_results for select using (student_id = auth.uid());
create policy "exam_student_insert" on public.exam_results for insert with check (student_id = auth.uid());
create policy "exam_coach_select"   on public.exam_results for select using (public.is_coach());
create policy "exam_coach_delete"   on public.exam_results for delete using (public.is_coach());

-- Yapay zekâ raporları (önbellek): öğrenci kendininkini, koç hepsini okur/yazar
create policy "report_student_select" on public.ai_reports for select using (student_id = auth.uid());
create policy "report_student_write"  on public.ai_reports for insert with check (student_id = auth.uid());
create policy "report_student_update" on public.ai_reports for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "report_coach_all"      on public.ai_reports for all using (public.is_coach()) with check (public.is_coach());

-- Günlük kullanım sayacı: herkes yalnızca kendi satırını
create policy "usage_own_all" on public.ai_usage for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Hedef (öğrenci başına tek satır): hem öğrenci hem koç girer/düzenler
create table if not exists public.exam_targets (
  student_id   uuid primary key references public.profiles(id) on delete cascade,
  exam_type    text not null check (exam_type in ('TYT','AYT','LGS','BRANS')),
  target_net   numeric not null check (target_net > 0 and target_net <= 500),
  target_score numeric check (target_score >= 0 and target_score <= 600),
  note         text check (char_length(note) <= 120),
  updated_at   timestamptz not null default now()
);
alter table public.exam_targets enable row level security;
create policy "target_student_select" on public.exam_targets for select using (student_id = auth.uid());
create policy "target_student_insert" on public.exam_targets for insert with check (student_id = auth.uid());
create policy "target_student_update" on public.exam_targets for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "target_coach_all"      on public.exam_targets for all using (public.is_coach()) with check (public.is_coach());

-- ===== Haftalık görevler, plan taslakları, bildirim abonelikleri =====
create table if not exists public.weekly_tasks(
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  subject text check (char_length(subject) <= 40),
  amount text check (char_length(amount) <= 60),
  done boolean not null default false,
  done_at timestamptz,
  source text not null default 'coach' check (source in ('coach','ai')),
  created_by uuid,
  created_at timestamptz not null default now());
create index if not exists weekly_tasks_student_idx on public.weekly_tasks(student_id, task_date);
alter table public.weekly_tasks enable row level security;
create policy tasks_select on public.weekly_tasks for select to authenticated using (student_id = (select auth.uid()) or (select public.is_coach()));
create policy tasks_coach_insert on public.weekly_tasks for insert to authenticated with check ((select public.is_coach()));
create policy tasks_coach_update on public.weekly_tasks for update to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
create policy tasks_coach_delete on public.weekly_tasks for delete to authenticated using ((select public.is_coach()));
create policy tasks_student_update on public.weekly_tasks for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
-- Öğrenci yalnızca "tamamlandı" durumunu değiştirebilir
create or replace function public.tasks_guard() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id or new.task_date <> old.task_date or new.title <> old.title
       or new.subject is distinct from old.subject or new.amount is distinct from old.amount
       or new.source <> old.source or new.created_by is distinct from old.created_by then
      raise exception 'Öğrenci yalnızca tamamlandı durumunu değiştirebilir';
    end if;
    new.done_at := case when new.done then coalesce(old.done_at, now()) else null end;
  end if;
  return new;
end $$;
drop trigger if exists tasks_guard_trg on public.weekly_tasks;
create trigger tasks_guard_trg before update on public.weekly_tasks for each row execute function public.tasks_guard();

create table if not exists public.plan_drafts(
  student_id uuid primary key references auth.users(id) on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now());
alter table public.plan_drafts enable row level security;
create policy plan_coach_all on public.plan_drafts for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

create table if not exists public.push_subs(
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now());
create index if not exists push_subs_student_idx on public.push_subs(student_id);
alter table public.push_subs enable row level security;
create policy push_own_select on public.push_subs for select to authenticated using (student_id = (select auth.uid()));
create policy push_own_insert on public.push_subs for insert to authenticated with check (student_id = (select auth.uid()));
create policy push_own_delete on public.push_subs for delete to authenticated using (student_id = (select auth.uid()));

-- Öğrenci kendi deneme kaydını silebilir/düzeltebilir; koç elle deneme ekleyebilir/silebilir
create policy exam_student_delete on public.exam_results for delete to authenticated using (student_id = (select auth.uid()));
create policy exam_student_update on public.exam_results for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy exam_coach_insert on public.exam_results for insert to authenticated with check ((select public.is_coach()));
create policy exam_coach_delete on public.exam_results for delete using (public.is_coach());

-- Gerçek zamanlı güncelleme
alter publication supabase_realtime add table public.exam_results, public.weekly_tasks;

-- ===== Hatırlatma bildirimleri (web push) =====
-- Sunucu anahtarları yalnızca servis rolünün okuyabildiği tabloda tutulur (değerleri buraya yazma).
create table if not exists public.app_secrets(name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- app_secrets içine VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET satırlarını ekle.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create or replace function public.call_reminders(k text) returns void language plpgsql security definer set search_path=public,extensions as $$
begin
  perform net.http_post(url:='https://PROJE-KODU.supabase.co/functions/v1/send-reminders',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select value from public.app_secrets where name='CRON_SECRET')),
    body:=jsonb_build_object('kind',k));
end $$;
revoke all on function public.call_reminders(text) from public, anon, authenticated;
select cron.schedule('reminders-afternoon','0 12 * * *',$$select public.call_reminders('afternoon')$$); -- 15:00 TSİ
select cron.schedule('reminders-evening','0 17 * * *',$$select public.call_reminders('evening')$$);   -- 20:00 TSİ
