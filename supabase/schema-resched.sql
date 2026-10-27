-- Geciken görevleri yeniden planlama: öğrenci yalnızca KENDİ, TAMAMLANMAMIŞ ve GEÇMİŞ görevlerini bugüne-14 güne taşıyabilir.
create or replace function public.tasks_guard() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id
       or (new.task_date <> old.task_date and coalesce(current_setting('app.resched',true),'')<>'1')
       or new.title <> old.title
       or new.subject is distinct from old.subject or new.amount is distinct from old.amount
       or new.week_title is distinct from old.week_title
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

-- Öğrencinin kendi ödevini eklemesi (kaynak 'student'): günde en çok 10 görev, tarih bugün..+14
alter table public.weekly_tasks drop constraint if exists weekly_tasks_source_check;
alter table public.weekly_tasks add constraint weekly_tasks_source_check check (source in ('coach','ai','student'));
create or replace function public.task_self_add(p_rows jsonb) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare r jsonb; n integer := 0; d date; t text; today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if auth.uid() is null or public.is_coach() then raise exception 'Yalnızca öğrenci'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5 then raise exception 'En fazla 5 görev'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    d := (r->>'d')::date; t := left(btrim(coalesce(r->>'title','')),120);
    if t = '' or d < today or d > today + 14 then continue; end if;
    if (select count(*) from public.weekly_tasks where student_id = auth.uid() and task_date = d and source = 'student') >= 10 then continue; end if;
    if exists (select 1 from public.weekly_tasks where student_id = auth.uid() and task_date = d and title = t and subject is not distinct from nullif(left(btrim(coalesce(r->>'subject','')),40),'')) then continue; end if;
    insert into public.weekly_tasks(student_id,task_date,title,subject,amount,source,created_by)
    values (auth.uid(), d, t, nullif(left(btrim(coalesce(r->>'subject','')),40),''), nullif(left(btrim(coalesce(r->>'amount','')),60),''), 'student', auth.uid());
    n := n + 1;
  end loop;
  return n;
end $$;
create or replace function public.task_self_del(p_id bigint) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  delete from public.weekly_tasks where id = p_id and student_id = auth.uid() and source = 'student' and done = false;
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.task_self_add(jsonb), public.task_self_del(bigint) from public, anon;
grant execute on function public.task_self_add(jsonb), public.task_self_del(bigint) to authenticated;
