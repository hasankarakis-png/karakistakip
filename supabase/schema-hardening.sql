-- v3.5 güvenlik sıkılaştırması (29.10.2026 güvenlik taramasından). DURUM: 29.10.2026 21:00 canlı veritabanına uygulandı ve doğrulandı.

-- 1) Öğrenci günlük kaydı: yalnızca kendi satırı, yalnızca son 2 gün ile yarın arası yazılabilir, silinemez.
--    (Eski "FOR ALL" kuralı geçmiş günleri uydurmaya/silmeye ve yarışma sıralamasını şişirmeye izin veriyordu.)
drop policy if exists daily_student_all on public.daily;
drop policy if exists daily_stu_sel on public.daily;
drop policy if exists daily_stu_ins on public.daily;
drop policy if exists daily_stu_upd on public.daily;
create policy daily_stu_sel on public.daily for select to authenticated using (student_id = (select auth.uid()));
create policy daily_stu_ins on public.daily for insert to authenticated
  with check (student_id = (select auth.uid()) and day between (now() at time zone 'Europe/Istanbul')::date - 2 and (now() at time zone 'Europe/Istanbul')::date + 1);
create policy daily_stu_upd on public.daily for update to authenticated
  using (student_id = (select auth.uid()) and day >= (now() at time zone 'Europe/Istanbul')::date - 2)
  with check (student_id = (select auth.uid()) and day between (now() at time zone 'Europe/Istanbul')::date - 2 and (now() at time zone 'Europe/Istanbul')::date + 1);

-- 2) Yalnızca RLS'e güvenilen yazma yetkileri kaldırılır (uygulama bu tablolara istemciden yazmaz; sunucu servis rolüyle yazar).
revoke insert, update, delete on public.profiles from authenticated, anon;
revoke insert, update, delete on public.ai_reports from authenticated, anon;
revoke all on public.ai_usage from authenticated, anon;
revoke usage on schema net from anon, authenticated;

-- 3) Kendi kendine kayıt açılırsa her yeni hesabın otomatik öğrenci olmasını engelle. Hesapları yalnızca
--    admin-students fonksiyonu ve scripts/create-users.mjs açar; ikisi de profili kendisi yazar.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 4) Konu takibi satırının boyutu sınırlanır (veritabanını şişirmeye karşı).
alter table public.topic_progress drop constraint if exists topic_progress_bytes;
alter table public.topic_progress add constraint topic_progress_bytes check (octet_length(done::text) <= 40000);

-- 5) Performans önerileri: RLS'te auth.uid() satır başına değil sorgu başına hesaplanır; eksik indeksler.
create index if not exists challenge_messages_student_idx on public.challenge_messages(student_id);
create index if not exists challenges_created_by_idx on public.challenges(created_by);
drop policy if exists tp_select on public.topic_progress;
drop policy if exists tp_insert on public.topic_progress;
drop policy if exists tp_update on public.topic_progress;
create policy tp_select on public.topic_progress for select to authenticated using (student_id = (select auth.uid()) or (select public.is_coach()));
create policy tp_insert on public.topic_progress for insert to authenticated with check (student_id = (select auth.uid()));
create policy tp_update on public.topic_progress for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
drop policy if exists pp_select on public.profile_photos;
drop policy if exists pp_insert on public.profile_photos;
drop policy if exists pp_update on public.profile_photos;
drop policy if exists pp_delete on public.profile_photos;
create policy pp_select on public.profile_photos for select to authenticated using (student_id = (select auth.uid()) or (select public.is_coach()));
create policy pp_insert on public.profile_photos for insert to authenticated with check (student_id = (select auth.uid()));
create policy pp_update on public.profile_photos for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy pp_delete on public.profile_photos for delete to authenticated using (student_id = (select auth.uid()) or (select public.is_coach()));

-- 6) Biten yarışmanın sohbetine (bitişten 1 gün sonra) yazılamaz: bkz. challenge_post içinde kontrol (aşağıda ayrıca uygulanmadı).
