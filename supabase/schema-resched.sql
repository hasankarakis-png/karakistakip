-- Geciken görevleri yeniden planlama: öğrenci yalnızca KENDİ, TAMAMLANMAMIŞ ve GEÇMİŞ görevlerini bugüne-14 güne taşıyabilir.
create or replace function public.tasks_guard() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id
       or (new.task_date <> old.task_date and coalesce(current_setting('app.resched',true),'')<>'1')
       or new.title <> old.title
       or new.subject is distinct from old.subject or new.amount is distinct from old.amount
       or new.source <> old.source or new.created_by is distinct from old.created_by then
      raise exception 'Öğrenci yalnızca tamamlandı durumunu değiştirebilir';
    end if;
    new.done_at := case when new.done then coalesce(old.done_at, now()) else null end;
  end if;
  return new;
end $$;

create or replace function public.task_reschedule(p_ids bigint[], p_date date) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_date < (now() at time zone 'Europe/Istanbul')::date or p_date > (now() at time zone 'Europe/Istanbul')::date + 14 then raise exception 'Tarih aralık dışı'; end if;
  perform set_config('app.resched','1',true);
  update public.weekly_tasks set task_date = p_date
   where id = any(p_ids) and done = false and task_date < (now() at time zone 'Europe/Istanbul')::date
     and (student_id = auth.uid() or public.is_coach());
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.task_reschedule(bigint[],date) from public, anon;
grant execute on function public.task_reschedule(bigint[],date) to authenticated;
