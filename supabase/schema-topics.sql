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

-- Profil fotoğrafı (uygulandı): öğrenci kendi 256px JPEG'ini yükler, koç hepsini görür
create table if not exists public.profile_photos (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  img text not null,
  updated_at timestamptz not null default now(),
  constraint profile_photos_fmt check (img like 'data:image/jpeg;base64,%'),
  constraint profile_photos_size check (length(img) <= 120000)
);
alter table public.profile_photos enable row level security;
create policy pp_select on public.profile_photos for select to authenticated using (student_id = auth.uid() or public.is_coach());
create policy pp_insert on public.profile_photos for insert to authenticated with check (student_id = auth.uid());
create policy pp_update on public.profile_photos for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy pp_delete on public.profile_photos for delete to authenticated using (student_id = auth.uid() or public.is_coach());
