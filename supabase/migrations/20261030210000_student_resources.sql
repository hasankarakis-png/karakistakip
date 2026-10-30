-- Karakış Takip: öğrenci kaynak/kitap ilerlemesi
create table if not exists public.student_resources (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  subject text not null check (char_length(subject) between 1 and 40),
  publisher text check (publisher is null or char_length(publisher) <= 80),
  total_units integer not null default 1 check (total_units between 1 and 10000),
  completed_units integer not null default 0 check (completed_units between 0 and total_units),
  unit_label text not null default 'test' check (unit_label in ('test','sayfa','soru','konu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_resources_student_created_idx
  on public.student_resources(student_id, created_at desc);
alter table public.student_resources enable row level security;
drop policy if exists student_resources_own_all on public.student_resources;
drop policy if exists student_resources_coach_all on public.student_resources;
drop policy if exists student_resources_access_all on public.student_resources;
create policy student_resources_access_all on public.student_resources
  for all to authenticated
  using (student_id = (select auth.uid()) or (select is_coach()))
  with check (student_id = (select auth.uid()) or (select is_coach()));
