-- DURUM: Supabase projesine uygulandı (tablo + challenge_board + yetkiler). Bildirim: functions/challenge-notify.
-- Challenge (yarışma): koç oluşturur, öğrenciler ortak sıralamayı görür.
-- Sıralamada yalnızca "Ad S." biçiminde kısaltılmış isim, süre/soru toplamı ve canlı durum görünür.
create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 80),
  metric text not null check (metric in ('minutes','questions')),
  start_day date not null,
  end_day date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  check (end_day >= start_day and end_day <= start_day + 60)
);
alter table public.challenges enable row level security;
drop policy if exists ch_select on public.challenges;
drop policy if exists ch_coach_ins on public.challenges;
drop policy if exists ch_coach_upd on public.challenges;
drop policy if exists ch_coach_del on public.challenges;
create policy ch_select on public.challenges for select to authenticated using (true);
create policy ch_coach_ins on public.challenges for insert to authenticated with check ((select public.is_coach()));
create policy ch_coach_upd on public.challenges for update to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
create policy ch_coach_del on public.challenges for delete to authenticated using ((select public.is_coach()));
revoke all on public.challenges from anon;
revoke insert, update, delete on public.challenges from authenticated;
grant select on public.challenges to authenticated;
grant insert (title, metric, start_day, end_day, created_by), update (title, metric, start_day, end_day), delete on public.challenges to authenticated;

create or replace function public.challenge_board(p_id bigint)
returns table(label text, total numeric, today numeric, live boolean, me boolean)
language plpgsql stable security definer set search_path = public as $$
declare c public.challenges; d0 date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role in ('student','coach')) then
    raise exception 'yetkisiz';
  end if;
  select * into c from public.challenges where id = p_id;
  if not found then return; end if;
  return query
  select
    (split_part(trim(p.name), ' ', 1) || case when position(' ' in trim(p.name)) > 0 then ' ' || upper(left(regexp_replace(trim(p.name), '^.*\s', ''), 1)) || '.' else '' end) as label,
    coalesce(sum(case when dd.day between c.start_day and c.end_day then
      case when (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end)) ~ '^[0-9]+(\.[0-9]+)?$'
           then (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end))::numeric else 0 end end), 0) as total,
    coalesce(sum(case when dd.day = d0 then
      case when (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end)) ~ '^[0-9]+(\.[0-9]+)?$'
           then (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end))::numeric else 0 end end), 0) as today,
    coalesce(bool_or(dd.day = d0 and dd.state ->> 'status' = 'study'), false) as live,
    (p.id = auth.uid()) as me
  from public.profiles p
  left join public.daily dd on dd.student_id = p.id and dd.day between c.start_day and c.end_day
  where p.role = 'student'
  group by p.id, p.name
  order by total desc, p.name;
end $$;
revoke all on function public.challenge_board(bigint) from public, anon;
grant execute on function public.challenge_board(bigint) to authenticated;

-- SOHBET (uygulandı): tüm erişim fonksiyonlarla; tablo doğrudan okunamaz/yazılamaz.
-- challenges.chat_open (koç sohbeti kapatabilir), challenge_messages(id, challenge_id, student_id, body<=300, hidden),
-- challenge_chat(p_id) son 80 mesaj (kısaltılmış isim, koç "Koç"), challenge_post(p_id,p_body) link/telefon/sosyal medya engeli,
-- 4 sn hız sınırı, günde 120 mesaj; challenge_msg_hide(p_msg) yalnızca koç (mesajı gizler).
