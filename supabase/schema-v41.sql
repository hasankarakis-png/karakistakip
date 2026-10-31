-- v4.1 (31 Ekim 2026): yarışma — gizlilik kilidi ve koçun elle girişi (canlıya uygulandı)
-- 1) Öğrenci challenge_prefs.hidden değerini değiştiremez; yalnızca koç (ya da servis) değiştirir. Takma ad öğrencide kalır.
create or replace function public.challenge_prefs_guard_hidden()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or (select public.is_coach()) then return new; end if;
  if tg_op = 'INSERT' then new.hidden := false; else new.hidden := old.hidden; end if;
  return new;
end;
$$;
drop trigger if exists challenge_prefs_guard_hidden on public.challenge_prefs;
create trigger challenge_prefs_guard_hidden before insert or update on public.challenge_prefs
for each row execute function public.challenge_prefs_guard_hidden();
drop policy if exists challenge_prefs_coach_write on public.challenge_prefs;
create policy challenge_prefs_coach_write on public.challenge_prefs for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));

-- 2) İnternete bağlanamayan öğrenciler için koçun elle süre/soru girişi; öğrenci okuyamaz, yazamaz.
create table if not exists public.challenge_manual (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  minutes integer not null default 0 check (minutes >= 0 and minutes <= 1440),
  questions integer not null default 0 check (questions >= 0 and questions <= 3000),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (student_id, day)
);
alter table public.challenge_manual enable row level security;
drop policy if exists challenge_manual_coach_all on public.challenge_manual;
create policy challenge_manual_coach_all on public.challenge_manual for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
revoke all on public.challenge_manual from anon;

-- 3) challenge_board: elle girişler toplama ve "bugün" kısmına eklenir (canlıdaki fonksiyonun güncel hâli için
--    pg_get_functiondef('public.challenge_board(bigint)'::regprocedure) ile okuyun).
