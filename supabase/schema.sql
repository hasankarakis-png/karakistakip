-- Karakış Günlük Takip · Supabase şeması
-- Supabase Dashboard > SQL Editor'a yapıştırıp bir kez çalıştırın.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('coach','student'))
);

create table public.daily (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  state jsonb not null,
  snap jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (student_id, day)
);
create index daily_day_idx on public.daily(day);

create table public.goals (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  subj text not null,
  q int not null default 0,
  m int not null default 0,
  primary key (student_id, day)
);

create table public.notes (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create table public.exams (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  ad text not null,
  net numeric not null,
  cz text not null,
  created_at timestamptz not null default now()
);

-- Koç mu? (RLS döngüsünü önlemek için security definer)
create or replace function public.is_coach() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
$$;

alter table public.profiles enable row level security;
alter table public.daily    enable row level security;
alter table public.goals    enable row level security;
alter table public.notes    enable row level security;
alter table public.exams    enable row level security;

-- profiles: herkes kendini, koç hepsini okur. Kimse tarayıcıdan profil yazamaz.
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_coach());

-- daily: öğrenci yalnızca kendi satırını okur/yazar, koç hepsini okur
create policy "daily_student_all" on public.daily for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "daily_coach_select" on public.daily for select
  using (public.is_coach());

-- goals / notes: koç yönetir, öğrenci kendininkini okur
create policy "goals_coach_all" on public.goals for all
  using (public.is_coach()) with check (public.is_coach());
create policy "goals_student_select" on public.goals for select
  using (student_id = auth.uid());
create policy "notes_coach_all" on public.notes for all
  using (public.is_coach()) with check (public.is_coach());
create policy "notes_student_select" on public.notes for select
  using (student_id = auth.uid());

-- exams: yalnızca koç
create policy "exams_coach_all" on public.exams for all
  using (public.is_coach()) with check (public.is_coach());

-- Canlı panel için gerçek zamanlı yayın
alter publication supabase_realtime add table public.daily, public.goals, public.notes, public.exams;
