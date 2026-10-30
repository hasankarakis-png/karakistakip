-- v3.7 · Öğrenci profili (sınav türü, alan, sınıf, okul, hedef), bildirim kapsamı ve ders adı düzeltmesi. (HENÜZ UYGULANMADI — onay bekliyor)
-- Yalnızca ekleme yapar; mevcut tablolar ve izinler değişmez.

create table if not exists public.student_profile(
  student_id uuid primary key references public.profiles(id) on delete cascade,
  exam text not null default 'YKS' check (exam in ('YKS','LGS')),
  field text check (field is null or field in ('SAY','EA','SÖZ','DİL','TYT')),
  grade text check (grade is null or grade in ('7','8','9','10','11','12','Mezun')),
  school text check (school is null or char_length(school) <= 80),
  target text check (target is null or char_length(target) <= 120),
  updated_at timestamptz not null default now());
alter table public.student_profile enable row level security;
revoke all on public.student_profile from anon;
grant select, insert, update, delete on public.student_profile to authenticated;
drop policy if exists sp_coach_all on public.student_profile;
create policy sp_coach_all on public.student_profile for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
drop policy if exists sp_student_select on public.student_profile;
create policy sp_student_select on public.student_profile for select to authenticated
  using (student_id = (select auth.uid()));

-- Koç, hangi öğrencinin bildirimi açık olduğunu görür (abonelik anahtarlarını görmeden, yalnızca sayı).
create or replace function public.push_coverage()
returns table(student_id uuid, n int) language sql stable security definer set search_path = public as $$
  select p.student_id, count(*)::int from public.push_subs p where public.is_coach() group by p.student_id
$$;
revoke all on function public.push_coverage() from public, anon;
grant execute on function public.push_coverage() to authenticated;

-- PDF'ten büyük harfle ya da bozuk okunan ders adları (tek seferlik düzeltme).
alter table public.weekly_tasks disable trigger tasks_guard_trg;
update public.weekly_tasks set subject = case subject
  when 'KİMYA' then 'Kimya' when 'Kimya/COĞRAFYA' then 'Kimya/Coğrafya'
  when 'Fizik/TARİH' then 'Fizik/Tarih' when 'Türkçe/SOSYAL' then 'Türkçe/Sosyal' else subject end
  where subject in ('KİMYA','Kimya/COĞRAFYA','Fizik/TARİH','Türkçe/SOSYAL');
update public.weekly_tasks set subject = case when title = 'Parabol' then 'Matematik' when title = 'Deneme' then 'Deneme' else 'Diğer' end
  where subject !~ '^[A-Za-zÇĞİÖŞÜçğıöşü]';
alter table public.weekly_tasks enable trigger tasks_guard_trg;
