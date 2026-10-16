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
