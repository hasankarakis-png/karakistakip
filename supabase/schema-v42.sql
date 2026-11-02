-- v4.2 (2 Kasım 2026): geçen haftadan kalan görevler — sarkıp sarkmayacağına KOÇ karar verir.
--   Koç "Yeni haftaya ekle" derse görevler yeni günlere taşınır (carry_state='carried', carried_from=eski tarih).
--   Koç "Ekleme" derse görevler kapatılır (carry_state='closed'); tüm listelerden, veli raporundan ve yapay zekâ
--   dağıtımından kalkar ama satır silinmez (geri alınabilir). Öğrenci artık kalan görevleri kendi taşıyamaz.

alter table public.weekly_tasks add column if not exists carry_state text check (carry_state in ('closed','carried'));
alter table public.weekly_tasks add column if not exists carried_from date;

-- 1) Öğrenci carry alanlarına dokunamaz
create or replace function public.tasks_guard() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id
       or (new.task_date <> old.task_date and coalesce(current_setting('app.resched',true),'')<>'1')
       or new.title <> old.title
       or new.subject is distinct from old.subject or new.amount is distinct from old.amount
       or new.source <> old.source or new.created_by is distinct from old.created_by
       or new.week_title is distinct from old.week_title
       or new.created_at is distinct from old.created_at
       or new.carry_state is distinct from old.carry_state
       or new.carried_from is distinct from old.carried_from then
      raise exception 'Öğrenci yalnızca tamamlandı durumunu değiştirebilir';
    end if;
    new.done_at := case when new.done then coalesce(old.done_at, now()) else null end;
  end if;
  return new;
end $$;

-- 2) Kalan görevi taşıma yalnızca koçta; taşınan görev "geçen haftadan" olarak işaretlenir, kapatılanlar taşınmaz
create or replace function public.task_reschedule(p_ids bigint[], p_date date) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer; today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if not public.is_coach() then raise exception 'Kalan görevleri yalnızca koç taşıyabilir'; end if;
  if p_date < today or p_date > today + 14 then raise exception 'Tarih aralık dışı'; end if;
  perform set_config('app.resched','1',true);
  update public.weekly_tasks
     set task_date = p_date, carried_from = coalesce(carried_from, task_date), carry_state = 'carried'
   where id = any(p_ids) and done = false and carry_state is distinct from 'closed' and task_date < today;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.task_reschedule(bigint[],date) from public, anon;
grant execute on function public.task_reschedule(bigint[],date) to authenticated;

-- 3) Veli raporu: kapatılan görevler sayılmaz (canlı tanımın iki sorgusuna koşul eklenir)
do $$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.parent_view(text)'::regprocedure);
  d2 := replace(d, 'from public.weekly_tasks where student_id = l.student_id',
                   'from public.weekly_tasks where carry_state is distinct from ''closed'' and student_id = l.student_id');
  if d2 = d then raise exception 'parent_view degismedi'; end if;
  execute d2;
end $$;
