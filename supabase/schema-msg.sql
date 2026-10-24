-- Koç ↔ öğrenci mesajlaşma
create table if not exists public.messages(
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  from_coach boolean not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz);
create index if not exists messages_student_idx on public.messages(student_id, created_at desc);
alter table public.messages enable row level security;
create policy msg_select on public.messages for select to authenticated using (student_id = (select auth.uid()) or (select public.is_coach()));
create policy msg_coach_insert on public.messages for insert to authenticated with check ((select public.is_coach()) and from_coach and read_at is null);
create policy msg_student_insert on public.messages for insert to authenticated with check (student_id = (select auth.uid()) and not from_coach and read_at is null);
create or replace function public.msg_read(p_student uuid) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if (select public.is_coach()) then
    update public.messages set read_at=now() where student_id=p_student and not from_coach and read_at is null;
  elsif p_student = auth.uid() then
    update public.messages set read_at=now() where student_id=p_student and from_coach and read_at is null;
  end if;
end $$;
revoke all on function public.msg_read(uuid) from public, anon;
grant execute on function public.msg_read(uuid) to authenticated;
alter publication supabase_realtime add table public.messages;
