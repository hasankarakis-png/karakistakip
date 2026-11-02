-- v4.4: Yarışmada rakiplerin süresi saniye saniye görünür.
-- challenge_board (dakika, yalnızca kendin/koç canlı görür) eski önbellekli telefonlar için olduğu gibi kalır.
-- Yeni: challenge_board2 → süre ölçütünde değerler SANİYE cinsindendir (soru ölçütünde adet), `running` bayrağı tüm
-- öğrenciler için görünür (katılmıyorum diyen ve takma ad seçen öğrencilerin tercihi korunur: gizli olanlar listede yok, takma ad kalır).
-- İstemci running=true satırların süresini her saniye kendisi ilerletir, 6 sn'de bir sunucudan düzeltir.
-- Bugünün süresi snap.m (dakikaya yuvarlı) yerine state'ten (done + çalışan oturum) tam hesaplanır; böylece sayaç geri/ileri sıçramaz.
-- Unutulan sayaç koruması v4.3 ile aynı: canlı kısım son kayıttan en fazla 3 saat sonrasına kadar sayılır.

create or replace function public.ch_running(p_state jsonb, p_upd timestamptz)
returns boolean language sql stable set search_path = public as $$
  select coalesce(
    p_state ->> 'status' = 'study'
    and jsonb_typeof(p_state -> 'cur') = 'object'
    and jsonb_typeof(p_state -> 'cur' -> 'start') = 'number'
    and jsonb_typeof(p_state -> 'cur' -> 'brk') = 'number'
    and jsonb_typeof(p_state -> 'done') = 'number'
    and now() < p_upd + interval '3 hours', false)
$$;

create or replace function public.ch_row_sec(p_state jsonb, p_snap jsonb, p_upd timestamptz, p_today boolean)
returns numeric language plpgsql stable set search_path = public as $$
declare base numeric := 0; st text; cur jsonb; dn numeric; s numeric; b numeric; endms numeric; net numeric := 0;
begin
  if (p_snap ->> 'm') ~ '^[0-9]+(\.[0-9]+)?$' then base := (p_snap ->> 'm')::numeric * 60; end if;
  if not p_today or p_state is null or jsonb_typeof(p_state -> 'done') is distinct from 'number' then return base; end if;
  dn := (p_state ->> 'done')::numeric; st := p_state ->> 'status'; cur := p_state -> 'cur';
  if st in ('study','break') and jsonb_typeof(cur) = 'object'
     and jsonb_typeof(cur -> 'start') = 'number' and jsonb_typeof(cur -> 'brk') = 'number' then
    s := (cur ->> 'start')::numeric; b := (cur ->> 'brk')::numeric;
    if st = 'break' then
      if jsonb_typeof(cur -> 'bs') = 'number' then net := (cur ->> 'bs')::numeric - s - b; else return base; end if;
    else
      endms := least(extract(epoch from now()) * 1000, extract(epoch from p_upd) * 1000 + 3 * 3600 * 1000);
      net := endms - s - b;
    end if;
  end if;
  return least(86400, greatest(0, (dn + net) / 1000));
end $$;

create or replace function public.challenge_board2(p_id bigint)
returns table(label text, total numeric, today numeric, running boolean, me boolean)
language plpgsql stable security definer set search_path to 'public' as $$
declare c public.challenges; d0 date := (now() at time zone 'Europe/Istanbul')::date; co boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role in ('student','coach')) then
    raise exception 'yetkisiz';
  end if;
  co := public.is_coach();
  select * into c from public.challenges where id = p_id;
  if not found then return; end if;
  return query
  select
    case when coalesce(cp.alias,'') <> '' and not co then cp.alias
         else (split_part(trim(p.name), ' ', 1) || case when position(' ' in trim(p.name)) > 0 then ' ' || upper(left(regexp_replace(trim(p.name), '^.*\s', ''), 1)) || '.' else '' end)
              || case when co and coalesce(cp.hidden,false) then ' (katılmıyor)' else '' end end as label,
    coalesce(sum(case when dd.day between c.start_day and c.end_day then
      case c.metric when 'minutes' then public.ch_row_sec(dd.state, dd.snap, dd.updated_at, dd.day = d0)
        else case when (dd.snap ->> 'q') ~ '^[0-9]+(\.[0-9]+)?$' then (dd.snap ->> 'q')::numeric else 0 end end end), 0)
      + coalesce((select sum(case c.metric when 'minutes' then mm.minutes * 60 else mm.questions end)
                  from public.challenge_manual mm
                  where mm.student_id = p.id and mm.day between c.start_day and c.end_day), 0)::numeric as total,
    coalesce(sum(case when dd.day = d0 then
      case c.metric when 'minutes' then public.ch_row_sec(dd.state, dd.snap, dd.updated_at, true)
        else case when (dd.snap ->> 'q') ~ '^[0-9]+(\.[0-9]+)?$' then (dd.snap ->> 'q')::numeric else 0 end end end), 0)
      + coalesce((select sum(case c.metric when 'minutes' then mm.minutes * 60 else mm.questions end)
                  from public.challenge_manual mm
                  where mm.student_id = p.id and mm.day = d0), 0)::numeric as today,
    coalesce(bool_or(dd.day = d0 and c.metric = 'minutes' and public.ch_running(dd.state, dd.updated_at)), false) as running,
    (p.id = auth.uid()) as me
  from public.profiles p
  left join public.challenge_prefs cp on cp.student_id = p.id
  left join public.daily dd on dd.student_id = p.id and dd.day between c.start_day and c.end_day
  where p.role = 'student' and (co or p.id = auth.uid() or not coalesce(cp.hidden, false))
  group by p.id, p.name, cp.alias, cp.hidden
  order by total desc, p.name;
end $$;
revoke all on function public.challenge_board2(bigint) from public, anon;
grant execute on function public.challenge_board2(bigint) to authenticated;
