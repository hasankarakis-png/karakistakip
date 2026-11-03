-- v4.8: Açılış duyuru paneli. Koç duyuru yazar; öğrenci girişten sonra önce duyuruyu görür ve "Okudum" diye onaylar.
-- Yalnızca ekleme yapar; drop/revoke yok.
-- announcements.student_ids: null = tüm öğrenciler (sonradan eklenenler dahil), dolu = yalnızca o öğrenciler (grup seçimi).
-- Duyuru starts_on…ends_on tarihleri arasında (ikisi de dahil) gösterilir; tarihleri istemci kendi gününe göre yazar.
create table if not exists public.announcements(
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 1000),
  starts_on date not null,
  ends_on date not null,
  student_ids uuid[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 60));
create index if not exists announcements_range_idx on public.announcements(ends_on desc, starts_on);
alter table public.announcements enable row level security;

-- Koç: hepsini görür, ekler, değiştirir, siler.
create policy ann_coach_all on public.announcements for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
-- Öğrenci: yalnızca kendine yönelik olanları okur.
create policy ann_student_select on public.announcements for select to authenticated
  using (student_ids is null or (select auth.uid()) = any(student_ids));

-- Onaylar: öğrenci yalnızca kendi adına, kendine yönelik duyuruyu onaylar; silemez, değiştiremez.
create table if not exists public.announcement_acks(
  announcement_id bigint not null references public.announcements(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  acked_at timestamptz not null default now(),
  primary key (announcement_id, student_id));
alter table public.announcement_acks enable row level security;

create policy ack_select on public.announcement_acks for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_coach()));
create policy ack_student_insert on public.announcement_acks for insert to authenticated
  with check (student_id = (select auth.uid()) and exists(
    select 1 from public.announcements a
    where a.id = announcement_id and (a.student_ids is null or (select auth.uid()) = any(a.student_ids))));
