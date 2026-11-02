-- v4.3: Yarışma sıralaması canlı süre alır.
-- Önceden bugünün süresi yalnızca öğrencinin son kaydettiği anlık görüntüden (daily.snap.m) geliyordu; çalışan oturum
-- ancak öğrenci bir düğmeye basınca sıralamaya yansıyordu. Artık bugünün süresi = bitmiş süre (state.done) + şu an
-- çalışan oturumun net süresi (state.cur), sunucu saatiyle hesaplanır.
-- Unutulan sayaç koruması: canlı kısım, satırın son güncellendiği andan en fazla 3 saat sonrasına kadar sayılır
-- (uygulama açıkken dakikada bir kayıt gelir; uygulama kapanırsa sayaç 3 saat sonra durur, öğrenci geri dönünce kaldığı yerden devam eder).
-- Hiçbir zaman son kaydedilen değerin altına inmez. Soru ölçütü değişmedi.
-- GERİ ALMA: challenge_board'ı v3.8 gizlilik sürümüne (snap.m kullanan) döndürmek için
--   aşağıdaki fonksiyondaki ch_row_min(...) çağrısını eski `(dd.snap ->> 'm')` ifadesiyle değiştirmek yeterlidir.

create or replace function public.ch_row_min(p_state jsonb, p_snap jsonb, p_upd timestamptz, p_today boolean)
returns numeric language plpgsql stable set search_path = public as $$
declare base numeric := 0; st text; cur jsonb; dn numeric; s numeric; b numeric; bs numeric; endms numeric; net numeric;
begin
  if (p_snap ->> 'm') ~ '^[0-9]+(\.[0-9]+)?$' then base := (p_snap ->> 'm')::numeric; end if;
  if not p_today or p_state is null then return base; end if;
  st := p_state ->> 'status'; cur := p_state -> 'cur';
  if st not in ('study','break') or jsonb_typeof(cur) is distinct from 'object'
     or jsonb_typeof(p_state -> 'done') is distinct from 'number'
     or jsonb_typeof(cur -> 'start') is distinct from 'number'
     or jsonb_typeof(cur -> 'brk') is distinct from 'number' then return base; end if;
  dn := (p_state ->> 'done')::numeric; s := (cur ->> 'start')::numeric; b := (cur ->> 'brk')::numeric;
  if st = 'break' then
    if jsonb_typeof(cur -> 'bs') is distinct from 'number' then return base; end if;
    bs := (cur ->> 'bs')::numeric; net := bs - s - b;
  else
    endms := least(extract(epoch from now()) * 1000, extract(epoch from p_upd) * 1000 + 3 * 3600 * 1000);
    net := endms - s - b;
  end if;
  return greatest(base, least(1440, round(greatest(0, dn + net) / 60000)));
end $$;
-- ch_row_min tablo okumaz, yalnızca verilen JSON'dan hesaplar; ayrıca yetki kısıtlamasına gerek yok.

create or replace function public.challenge_board(p_id bigint)
returns table(label text, total numeric, today numeric, live boolean, me boolean)
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
      case c.metric when 'minutes' then public.ch_row_min(dd.state, dd.snap, dd.updated_at, dd.day = d0)
        else case when (dd.snap ->> 'q') ~ '^[0-9]+(\.[0-9]+)?$' then (dd.snap ->> 'q')::numeric else 0 end end end), 0)
      + coalesce((select sum(case c.metric when 'minutes' then mm.minutes else mm.questions end)
                  from public.challenge_manual mm
                  where mm.student_id = p.id and mm.day between c.start_day and c.end_day), 0)::numeric as total,
    coalesce(sum(case when dd.day = d0 then
      case c.metric when 'minutes' then public.ch_row_min(dd.state, dd.snap, dd.updated_at, true)
        else case when (dd.snap ->> 'q') ~ '^[0-9]+(\.[0-9]+)?$' then (dd.snap ->> 'q')::numeric else 0 end end end), 0)
      + coalesce((select sum(case c.metric when 'minutes' then mm.minutes else mm.questions end)
                  from public.challenge_manual mm
                  where mm.student_id = p.id and mm.day = d0), 0)::numeric as today,
    case when co or p.id = auth.uid() then coalesce(bool_or(dd.day = d0 and dd.state ->> 'status' = 'study'), false) else false end as live,
    (p.id = auth.uid()) as me
  from public.profiles p
  left join public.challenge_prefs cp on cp.student_id = p.id
  left join public.daily dd on dd.student_id = p.id and dd.day between c.start_day and c.end_day
  where p.role = 'student' and (co or p.id = auth.uid() or not coalesce(cp.hidden, false))
  group by p.id, p.name, cp.alias, cp.hidden
  order by total desc, p.name;
end $$;
-- create or replace mevcut yetkileri korur (yalnızca authenticated çalıştırabilir); revoke/grant gerekmez.
