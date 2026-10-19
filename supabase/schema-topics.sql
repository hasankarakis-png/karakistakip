-- Konu takibi: öğrencinin bitirdiği konular (uygulandı)
create table if not exists public.topic_progress (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  done jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint topic_progress_size check (jsonb_array_length(done) <= 1500)
);
alter table public.topic_progress enable row level security;
create policy tp_select on public.topic_progress for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy tp_insert on public.topic_progress for insert to authenticated with check (student_id = auth.uid());
create policy tp_update on public.topic_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
