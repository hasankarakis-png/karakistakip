-- v4.0 · Veli sayfası grafikli haftalık rapor: parent_view() genişletildi.
-- Yeni alanlar: detay (son 42 gün: süre, soru, doğru, ders bazında dakika ve soru), gorevler (son 21 gün),
-- hedef / hedef_tur (son denemenin türüne uyan hedef net), denemeler 8'e çıktı.
-- Eski alanlar (gunler, gorev) eski önbellekli sayfalar için korunur.
-- Gizlilik değişmedi: uyku, ruh hali, stres, enerji, notlar ve gizli notlar gönderilmez.
-- Yalnızca CREATE OR REPLACE: mevcut yetkiler (anon execute) aynen kalır.
create or replace function public.parent_view(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare l public.parent_links; nm text; d0 date := (now() at time zone 'Europe/Istanbul')::date; lt text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then return jsonb_build_object('error','gecersiz'); end if;
  select * into l from public.parent_links where token = p_token;
  if not found or l.revoked or l.expires_at < now() then return jsonb_build_object('error','gecersiz'); end if;
  if not coalesce((select granted from public.consents where student_id = l.student_id and kind = 'veli_riza' order by created_at desc limit 1), false) then
    return jsonb_build_object('error','riza');
  end if;
  update public.parent_links set last_seen = now() where token = p_token;
  select split_part(trim(name), ' ', 1) into nm from public.profiles where id = l.student_id;
  select exam_type into lt from public.exam_results where student_id = l.student_id and total_net is not null
    order by exam_date desc nulls last, created_at desc limit 1;
  return jsonb_build_object(
    'v', 2, 'ad', nm, 'bitis', l.expires_at, 'bugun', d0,
    'gunler', (select coalesce(jsonb_agg(jsonb_build_object('gun', day,
        'dk', case when (snap->>'m') ~ '^[0-9]+(\.[0-9]+)?$' then (snap->>'m')::numeric else 0 end,
        'soru', case when (snap->>'q') ~ '^[0-9]+(\.[0-9]+)?$' then (snap->>'q')::numeric else 0 end) order by day), '[]'::jsonb)
      from public.daily where student_id = l.student_id and day between d0 - 29 and d0),
    'gorev', (select jsonb_build_object('toplam', count(*), 'tamam', count(*) filter (where done))
      from public.weekly_tasks where student_id = l.student_id and task_date between d0 - 29 and d0),
    'detay', (select coalesce(jsonb_agg(jsonb_build_object(
        'gun', d.day,
        'dk', least(1440, round(greatest(
            case when (d.snap->>'m') ~ '^[0-9]+(\.[0-9]+)?$' then (d.snap->>'m')::numeric else 0 end,
            case when (d.state->>'done') ~ '^[0-9]+(\.[0-9]+)?$' then (d.state->>'done')::numeric / 60000 else 0 end))),
        'soru', greatest(case when (d.snap->>'q') ~ '^[0-9]+(\.[0-9]+)?$' then (d.snap->>'q')::numeric else 0 end, q.qn),
        'dogru', greatest(case when (d.snap->>'c') ~ '^[0-9]+(\.[0-9]+)?$' then (d.snap->>'c')::numeric else 0 end, q.qc),
        'ders', s.so,
        'qs', q.qa) order by d.day), '[]'::jsonb)
      from public.daily d
      left join lateral (
        select coalesce(sum(case when (e->>'n') ~ '^[0-9]+(\.[0-9]+)?$' then (e->>'n')::numeric end), 0) qn,
               coalesce(sum(case when (e->>'c') ~ '^[0-9]+(\.[0-9]+)?$' then (e->>'c')::numeric end), 0) qc,
               coalesce(jsonb_agg(jsonb_build_object('s', left(coalesce(e->>'s', ''), 40),
                 'n', case when (e->>'n') ~ '^[0-9]+(\.[0-9]+)?$' then (e->>'n')::numeric else 0 end,
                 'c', case when (e->>'c') ~ '^[0-9]+(\.[0-9]+)?$' then (e->>'c')::numeric else 0 end)), '[]'::jsonb) qa
        from jsonb_array_elements(case when jsonb_typeof(d.state->'qs') = 'array' then d.state->'qs' else '[]'::jsonb end) e
        where jsonb_typeof(e) = 'object'
      ) q on true
      left join lateral (
        select coalesce(jsonb_object_agg(left(k, 40), round(v::numeric / 60000)), '{}'::jsonb) so
        from jsonb_each_text(case when jsonb_typeof(d.state->'subt') = 'object' then d.state->'subt' else '{}'::jsonb end) t(k, v)
        where v ~ '^[0-9]+(\.[0-9]+)?$' and k <> ''
      ) s on true
      where d.student_id = l.student_id and d.day between d0 - 41 and d0),
    'gorevler', (select coalesce(jsonb_agg(jsonb_build_object('tarih', task_date, 'baslik', left(coalesce(title, ''), 120),
        'ders', left(coalesce(subject, ''), 40), 'tamam', coalesce(done, false)) order by task_date, id), '[]'::jsonb)
      from public.weekly_tasks where student_id = l.student_id and task_date between d0 - 20 and d0),
    'denemeler', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('ad', exam_name, 'tur', exam_type, 'tarih', exam_date, 'net', total_net) x
      from public.exam_results where student_id = l.student_id order by exam_date desc nulls last, created_at desc limit 8) s),
    'hedef', (select target_net from public.exam_targets where student_id = l.student_id and target_net is not null
      order by (exam_type is not distinct from lt) desc, exam_type limit 1),
    'hedef_tur', (select exam_type from public.exam_targets where student_id = l.student_id and target_net is not null
      order by (exam_type is not distinct from lt) desc, exam_type limit 1));
end $function$;
