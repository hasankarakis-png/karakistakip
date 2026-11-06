-- v5.1: Puan yarışmasında isimlerin açılıp kapanması KOÇTA (challenges.names_open).
-- Yalnızca ekleme/yenileme yapar (drop/revoke yok). Varsayılan: kapalı (öğrenciler yalnızca kendi adını görür).
-- challenge_board3: isimler yalnızca koça, kişinin kendi satırına ve koç names_open=true yaptıysa herkese gönderilir
-- (v5.0'daki "end_day gelince otomatik açılır" kuralı kalktı; açma/kapatma tamamen koçun elinde).
alter table public.challenges add column if not exists names_open boolean not null default false;
grant insert (names_open), update (names_open) on public.challenges to authenticated;

create or replace function public.challenge_board3(p_id bigint)
returns table(rid text, label text, sec numeric, qn numeric, tsec numeric, tqn numeric,
              running boolean, me boolean, rev boolean, days jsonb)
language plpgsql stable security definer set search_path to 'public' as $$
#variable_conflict use_column
declare c public.challenges; d0 date := (now() at time zone 'Europe/Istanbul')::date; co boolean; shown boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role in ('student','coach')) then
    raise exception 'yetkisiz';
  end if;
  co := public.is_coach();
  select * into c from public.challenges where id = p_id;
  if not found then return; end if;
  shown := co or coalesce(c.names_open, false);
  return query
  with s as (
    select p.id as sid, p.name as sname, coalesce(cp.hidden, false) as shid
    from public.profiles p
    left join public.challenge_prefs cp on cp.student_id = p.id
    where p.role = 'student' and (co or p.id = auth.uid() or not coalesce(cp.hidden, false))
  ),
  d as (
    select s.sid as dsid, n.n as dn,
      coalesce((select sum(public.ch_row_sec(dd.state, dd.snap, dd.updated_at, dd.day = d0))
                from public.daily dd where dd.student_id = s.sid and dd.day = c.start_day + n.n), 0)
      + coalesce((select sum(mm.minutes * 60) from public.challenge_manual mm
                  where mm.student_id = s.sid and mm.day = c.start_day + n.n), 0) as dsec,
      coalesce((select sum(case when (dd.snap ->> 'q') ~ '^[0-9]+(\.[0-9]+)?$' then (dd.snap ->> 'q')::numeric else 0 end)
                from public.daily dd where dd.student_id = s.sid and dd.day = c.start_day + n.n), 0)
      + coalesce((select sum(mm.questions) from public.challenge_manual mm
                  where mm.student_id = s.sid and mm.day = c.start_day + n.n), 0) as dqn
    from s cross join generate_series(0, least(c.end_day, d0) - c.start_day) as n(n)
  )
  select
    md5(s.sid::text || ':' || p_id::text || ':' || d0::text) as rid,
    case when shown or s.sid = auth.uid() then
      (split_part(trim(s.sname), ' ', 1) || case when position(' ' in trim(s.sname)) > 0
         then ' ' || upper(left(regexp_replace(trim(s.sname), '^.*\s', ''), 1)) || '.' else '' end)
      || case when co and s.shid then ' (katılmıyor)' else '' end
    else null end as label,
    coalesce(sum(d.dsec), 0)::numeric as sec,
    coalesce(sum(d.dqn), 0)::numeric as qn,
    coalesce(sum(d.dsec) filter (where d.dn = d0 - c.start_day), 0)::numeric as tsec,
    coalesce(sum(d.dqn) filter (where d.dn = d0 - c.start_day), 0)::numeric as tqn,
    (d0 between c.start_day and c.end_day
       and exists (select 1 from public.daily dd
                   where dd.student_id = s.sid and dd.day = d0 and public.ch_running(dd.state, dd.updated_at))) as running,
    (s.sid = auth.uid()) as me,
    shown as rev,
    coalesce(jsonb_agg(jsonb_build_array(d.dn, d.dsec, d.dqn) order by d.dn) filter (where d.dn is not null), '[]'::jsonb) as days
  from s left join d on d.dsid = s.sid
  group by s.sid, s.sname, s.shid
  order by coalesce(sum(d.dqn), 0) + floor(coalesce(sum(d.dsec), 0) / 60) desc, s.sname;
end $$;
revoke all on function public.challenge_board3(bigint) from public, anon;
grant execute on function public.challenge_board3(bigint) to authenticated;
