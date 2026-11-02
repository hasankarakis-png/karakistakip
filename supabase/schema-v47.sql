-- v4.7: Öğrenci, BU HAFTANIN geçen günlerinden kalan görevlerini haftanın kalan günlerine (yapay zekâ önerisiyle) dağıtabilir.
-- Önceki haftalardan kalanlar yine koç kararını bekler (v4.2 kuralı korunur). Yalnızca ekleme yapar; drop/revoke yok.
-- weekly_tasks.self_from: öğrencinin kaydırmadan önceki tarihi (koç ekranında "öğrenci kaydırdı" işareti, geri alma).
alter table public.weekly_tasks add column if not exists self_from date;

-- Öğrenci yine yalnızca "tamamlandı" durumunu değiştirebilir; tarih ve self_from yalnızca kaydırma fonksiyonlarından (app.resched) değişir.
create or replace function public.tasks_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id
       or (new.task_date <> old.task_date and coalesce(current_setting('app.resched',true),'')<>'1')
       or (new.self_from is distinct from old.self_from and coalesce(current_setting('app.resched',true),'')<>'1')
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

-- p_moves: [{"id":123,"d":"2026-11-05"}, ...]. Yalnızca kendi görevi, tamamlanmamış, koçun kapatmadığı,
-- tarihi bu haftanın Pazartesi'si ile dün arasında olan görevler; yeni tarih bugün ile bu Pazar arasında olmalı.
create or replace function public.task_self_reschedule(p_moves jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Istanbul')::date;
  mon date := today - (extract(isodow from today)::int - 1);
  sun date := mon + 6;
  m jsonb; d date; k integer; n integer := 0;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if jsonb_typeof(p_moves) is distinct from 'array' or jsonb_array_length(p_moves) > 60 then raise exception 'Geçersiz istek'; end if;
  perform set_config('app.resched','1',true);
  for m in select * from jsonb_array_elements(p_moves) loop
    d := (m->>'d')::date;
    if d is null or d < today or d > sun then raise exception 'Tarih bu haftanın kalan günlerinden olmalı'; end if;
    update public.weekly_tasks
       set self_from = coalesce(self_from, task_date), task_date = d
     where id = (m->>'id')::bigint and student_id = auth.uid() and done = false
       and carry_state is distinct from 'closed' and task_date >= mon and task_date < today;
    get diagnostics k = row_count; n := n + k;
  end loop;
  return n;
end $$;

-- Öğrencinin kendi dağıtımını geri alması: görev kaydırmadan önceki tarihine döner (yalnız bu hafta içi).
create or replace function public.task_self_undo(p_ids bigint[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Istanbul')::date;
  mon date := today - (extract(isodow from today)::int - 1);
  n integer;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if coalesce(array_length(p_ids,1),0) > 60 then raise exception 'Geçersiz istek'; end if;
  perform set_config('app.resched','1',true);
  update public.weekly_tasks set task_date = self_from, self_from = null
   where id = any(p_ids) and student_id = auth.uid() and done = false and self_from is not null and self_from >= mon;
  get diagnostics n = row_count;
  return n;
end $$;
