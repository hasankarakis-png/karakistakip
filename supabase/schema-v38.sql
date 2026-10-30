-- v3.8 · 2. ve 3. aşama: gizli not, görüşme günlüğü, gruplar, plan şablonları, deneme takvimi, yanlış defteri, (HENÜZ UYGULANMADI — onay bekliyor)
-- yarışma gizliliği, KVKK izin kayıtları, veli bağlantısı, ön görüşme başvuruları, paket takibi.

-- 1) Gizli koç notu: öğrenci görmez
alter table public.notes add column if not exists private boolean not null default false;
drop policy if exists notes_student_select on public.notes;
create policy notes_student_select on public.notes for select to authenticated
  using (student_id = (select auth.uid()) and not private);

-- 2) Görüşme günlüğü (yalnız koç)
create table if not exists public.meetings(
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  met_on date not null default ((now() at time zone 'Europe/Istanbul')::date),
  who text not null default 'öğrenci' check (who in ('öğrenci','veli','öğrenci+veli')),
  summary text not null check (char_length(summary) between 1 and 2000),
  decisions text check (decisions is null or char_length(decisions) <= 1000),
  created_at timestamptz not null default now());
create index if not exists meetings_student_idx on public.meetings(student_id, met_on desc);

-- 3) Gruplar: koçun öğrenciye verdiği etiketler
alter table public.student_profile add column if not exists tags text[] not null default '{}';
alter table public.student_profile drop constraint if exists student_profile_tags_max;
alter table public.student_profile add constraint student_profile_tags_max check (cardinality(tags) <= 8);

-- 4) Plan şablonları (yalnız koç): items = [{dow:0-6 (0=Pzt), title, subject, amount}]
create table if not exists public.plan_templates(
  id bigserial primary key,
  name text not null check (char_length(name) between 1 and 60),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 200),
  created_at timestamptz not null default now());

-- 5) Deneme takvimi: MEBİ 2026–2027 YKS deneme haftaları (MEB takvimi; exam_date = haftanın ilk günü)
insert into public.exam_calendar(exam_date, title, exam_type, scope)
select v.d::date, v.t, 'TYT', 'deneme' from (values
  ('2026-10-12','MEBİ YKS denemesi (12–18 Ekim)'),('2026-11-09','MEBİ YKS denemesi (9–15 Kasım)'),
  ('2026-12-14','MEBİ YKS denemesi (14–20 Aralık)'),('2027-01-11','MEBİ YKS denemesi (11–17 Ocak)'),
  ('2027-02-15','MEBİ YKS denemesi (15–21 Şubat)'),('2027-03-15','MEBİ YKS denemesi (15–21 Mart)'),
  ('2027-04-12','MEBİ YKS denemesi (12–18 Nisan)'),('2027-05-10','MEBİ YKS denemesi (10–16 Mayıs)'),
  ('2027-05-17','MEBİ YKS denemesi (17–23 Mayıs)'),('2027-05-31','MEBİ YKS denemesi (31 Mayıs–6 Haziran)'),
  ('2027-06-07','MEBİ YKS denemesi (7–13 Haziran)')) v(d,t)
where not exists (select 1 from public.exam_calendar e where e.exam_date = v.d::date and e.scope = 'deneme');

-- 6) Yanlış defteri (öğrenci kendi kayıtlarını yönetir, koç okur)
create table if not exists public.wrong_book(
  id bigserial primary key,
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 40),
  topic text check (topic is null or char_length(topic) <= 80),
  cause text check (cause is null or char_length(cause) <= 40),
  note text check (note is null or char_length(note) <= 500),
  img text check (img is null or (char_length(img) <= 450000 and img ~ '^data:image/(jpeg|png|webp);base64,')),
  stage smallint not null default 0 check (stage between 0 and 3),
  next_review date,
  created_at timestamptz not null default now());
create index if not exists wrong_book_student_idx on public.wrong_book(student_id, next_review);

-- 7) Yarışma tercihi: katılmama ve takma ad
create table if not exists public.challenge_prefs(
  student_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  hidden boolean not null default false,
  alias text check (alias is null or (char_length(alias) between 2 and 20 and alias ~ '^[0-9A-Za-zÇĞİÖŞÜçğıöşü ._-]+$')),
  updated_at timestamptz not null default now());

-- 8) KVKK izin kayıtları (yalnız koç; veli rızası veli bağlantısının ön koşulu)
create table if not exists public.consents(
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('aydinlatma','veli_riza','ai_yurtdisi','whatsapp')),
  granted boolean not null,
  by_name text check (by_name is null or char_length(by_name) <= 80),
  method text check (method is null or method in ('yazılı','sözlü','elektronik')),
  text_version text not null default 'taslak-2026-10',
  created_at timestamptz not null default now());
create index if not exists consents_student_idx on public.consents(student_id, kind, created_at desc);

-- 9) Veli bağlantısı: hesapsız, süreli, iptal edilebilir salt okunur özet
create table if not exists public.parent_links(
  token text primary key check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  student_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now());

-- 10) Ön görüşme başvuruları (tanıtım sitesi → lead-submit fonksiyonu yazar, koç okur)
create table if not exists public.leads(
  id bigserial primary key,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[0-9]{10,15}$'),
  exam text check (exam is null or exam in ('YKS','LGS','Diğer')),
  grade text check (grade is null or char_length(grade) <= 20),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'yeni' check (status in ('yeni','arandı','görüşüldü','kayıt oldu','vazgeçti')),
  consent boolean not null check (consent),
  ip_hash text,
  created_at timestamptz not null default now());

-- 11) Paket ve yenileme takibi (yalnız koç)
create table if not exists public.packages(
  student_id uuid primary key references public.profiles(id) on delete cascade,
  name text check (name is null or char_length(name) <= 60),
  ends_on date,
  paid boolean not null default false,
  note text check (note is null or char_length(note) <= 300),
  updated_at timestamptz not null default now());

-- Erişim kuralları
do $$ declare t text; begin
  foreach t in array array['meetings','plan_templates','wrong_book','challenge_prefs','consents','parent_links','leads','packages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
grant usage, select on sequence public.meetings_id_seq, public.plan_templates_id_seq, public.wrong_book_id_seq, public.consents_id_seq, public.leads_id_seq to authenticated;
do $$ declare t text; begin
  foreach t in array array['meetings','plan_templates','consents','parent_links','leads','packages'] loop
    execute format('drop policy if exists %I on public.%I', t||'_coach_all', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()))', t||'_coach_all', t);
  end loop;
  foreach t in array array['wrong_book','challenge_prefs'] loop
    execute format('drop policy if exists %I on public.%I', t||'_own', t);
    execute format('create policy %I on public.%I for all to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()))', t||'_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_coach_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_coach()))', t||'_coach_select', t);
  end loop;
end $$;

-- Yarışma sıralaması: takma ad, katılmayanlar gizli, "şu an çalışıyor" yalnızca koça ve öğrencinin kendisine
create or replace function public.challenge_board(p_id bigint)
 returns table(label text, total numeric, today numeric, live boolean, me boolean)
 language plpgsql stable security definer set search_path to 'public'
as $function$
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
      case when (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end)) ~ '^[0-9]+(\.[0-9]+)?$'
           then (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end))::numeric else 0 end end), 0) as total,
    coalesce(sum(case when dd.day = d0 then
      case when (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end)) ~ '^[0-9]+(\.[0-9]+)?$'
           then (dd.snap ->> (case c.metric when 'minutes' then 'm' else 'q' end))::numeric else 0 end end), 0) as today,
    case when co or p.id = auth.uid() then coalesce(bool_or(dd.day = d0 and dd.state ->> 'status' = 'study'), false) else false end as live,
    (p.id = auth.uid()) as me
  from public.profiles p
  left join public.challenge_prefs cp on cp.student_id = p.id
  left join public.daily dd on dd.student_id = p.id and dd.day between c.start_day and c.end_day
  where p.role = 'student' and (co or p.id = auth.uid() or not coalesce(cp.hidden, false))
  group by p.id, p.name, cp.alias, cp.hidden
  order by total desc, p.name;
end $function$;

-- Veli sayfası: belirteç geçerliyse ve en son veli rızası "verildi" ise son 30 günün özeti (uyku/ruh hali gönderilmez)
create or replace function public.parent_view(p_token text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare l public.parent_links; nm text; d0 date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then return jsonb_build_object('error','gecersiz'); end if;
  select * into l from public.parent_links where token = p_token;
  if not found or l.revoked or l.expires_at < now() then return jsonb_build_object('error','gecersiz'); end if;
  if not coalesce((select granted from public.consents where student_id = l.student_id and kind = 'veli_riza' order by created_at desc limit 1), false) then
    return jsonb_build_object('error','riza');
  end if;
  update public.parent_links set last_seen = now() where token = p_token;
  select split_part(trim(name), ' ', 1) into nm from public.profiles where id = l.student_id;
  return jsonb_build_object(
    'ad', nm, 'bitis', l.expires_at, 'bugun', d0,
    'gunler', (select coalesce(jsonb_agg(jsonb_build_object('gun', day,
        'dk', case when (snap->>'m') ~ '^[0-9]+(\.[0-9]+)?$' then (snap->>'m')::numeric else 0 end,
        'soru', case when (snap->>'q') ~ '^[0-9]+(\.[0-9]+)?$' then (snap->>'q')::numeric else 0 end) order by day), '[]'::jsonb)
      from public.daily where student_id = l.student_id and day between d0 - 29 and d0),
    'gorev', (select jsonb_build_object('toplam', count(*), 'tamam', count(*) filter (where done))
      from public.weekly_tasks where student_id = l.student_id and task_date between d0 - 29 and d0),
    'denemeler', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('ad', exam_name, 'tur', exam_type, 'tarih', exam_date, 'net', total_net) x
      from public.exam_results where student_id = l.student_id order by exam_date desc nulls last, created_at desc limit 6) s));
end $function$;
revoke all on function public.parent_view(text) from public;
grant execute on function public.parent_view(text) to anon, authenticated;
