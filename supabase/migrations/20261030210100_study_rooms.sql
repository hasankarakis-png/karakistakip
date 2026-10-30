-- Karakış Takip: ortak çalışma odaları ve senkron sayaç
create table if not exists public.study_rooms (
  id bigint generated always as identity primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  duration_minutes integer not null check (duration_minutes in (25,45,60)),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '61 minutes')
);
create index if not exists study_rooms_active_ends_idx on public.study_rooms(active, ends_at);
create table if not exists public.study_room_members (
  room_id bigint not null references public.study_rooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, student_id)
);
create index if not exists study_room_members_student_idx on public.study_room_members(student_id, joined_at desc);
alter table public.study_rooms enable row level security;
alter table public.study_room_members enable row level security;
drop policy if exists study_rooms_select_open on public.study_rooms;
drop policy if exists study_rooms_insert_owner on public.study_rooms;
drop policy if exists study_rooms_update_owner on public.study_rooms;
drop policy if exists study_rooms_delete_owner on public.study_rooms;
create policy study_rooms_select_open on public.study_rooms for select to authenticated
  using (active = true or created_by = (select auth.uid()) or (select is_coach()));
create policy study_rooms_insert_owner on public.study_rooms for insert to authenticated
  with check (created_by = (select auth.uid()) or (select is_coach()));
create policy study_rooms_update_owner on public.study_rooms for update to authenticated
  using (created_by = (select auth.uid()) or (select is_coach()))
  with check (created_by = (select auth.uid()) or (select is_coach()));
create policy study_rooms_delete_owner on public.study_rooms for delete to authenticated
  using (created_by = (select auth.uid()) or (select is_coach()));
drop policy if exists study_room_members_select_own on public.study_room_members;
drop policy if exists study_room_members_insert_own on public.study_room_members;
drop policy if exists study_room_members_delete_own on public.study_room_members;
create policy study_room_members_select_own on public.study_room_members for select to authenticated
  using (student_id = (select auth.uid()) or (select is_coach()));
create policy study_room_members_insert_own on public.study_room_members for insert to authenticated
  with check (student_id = (select auth.uid()) and exists (
    select 1 from public.study_rooms r where r.id = room_id and r.active = true and r.ends_at > now()
  ));
create policy study_room_members_delete_own on public.study_room_members for delete to authenticated
  using (student_id = (select auth.uid()) or (select is_coach()));
