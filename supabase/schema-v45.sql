-- v4.5 · Haftalık veli raporu "Konu eksik haritası": parent_view() çıktısına 'konular' eklendi
-- (son 3 denemede yanlış/boş bırakılan konular; ders, konu, y=yanlış, b=boş, n=kaç denemede). Başka hiçbir alan değişmez.
-- Canlı fonksiyon tanımı okunup yalnızca sonuna yeni anahtar eklenir (CREATE OR REPLACE: yetkiler aynen kalır).
do $do$
declare def text; frag text; neu text;
begin
  def := pg_get_functiondef('public.parent_view(text)'::regprocedure);
  if def like '%''konular''%' then return; end if;
  frag := $frag$ limit 1),
    'konular', (select coalesce(jsonb_agg(jsonb_build_object('ders', z.d, 'konu', z.k, 'y', z.y, 'b', z.b, 'n', z.n) order by z.y + z.b desc, z.n desc), '[]'::jsonb)
      from (select left(t->>'ders', 40) d, left(t->>'konu', 100) k,
              sum(case when t->>'yanlis' ~ '^[0-9]{1,3}$' then (t->>'yanlis')::int else 0 end) y,
              sum(case when t->>'bos' ~ '^[0-9]{1,3}$' then (t->>'bos')::int else 0 end) b,
              count(distinct e.id) n
            from (select id, topics from public.exam_results where student_id = l.student_id and jsonb_typeof(topics) = 'array'
                  order by exam_date desc nulls last, created_at desc limit 3) e,
                 jsonb_array_elements(e.topics) t
            where jsonb_typeof(t) = 'object' and coalesce(t->>'konu', '') <> ''
            group by 1, 2
            having sum(case when t->>'yanlis' ~ '^[0-9]{1,3}$' then (t->>'yanlis')::int else 0 end)
                 + sum(case when t->>'bos' ~ '^[0-9]{1,3}$' then (t->>'bos')::int else 0 end) > 0
            order by 3 desc, 4 desc limit 80) z));
end $function$$frag$;
  neu := replace(def, E' limit 1));\nend $function$', frag);
  if neu = def then raise exception 'parent_view sonu bulunamadı'; end if;
  execute neu;
end $do$;
