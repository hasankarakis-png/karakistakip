-- Existing Supabase deployments: apply once to repair weekly plan assignment.
-- Adds the field used by the coach's weekly-plan uploader and prevents students
-- from changing coach-owned task metadata through direct table updates.

alter table public.weekly_tasks
  add column if not exists week_title text;

alter table public.weekly_tasks
  drop constraint if exists weekly_tasks_week_title_len_chk;

alter table public.weekly_tasks
  add constraint weekly_tasks_week_title_len_chk
  check (week_title is null or char_length(week_title) <= 40);

alter table public.weekly_tasks
  drop constraint if exists weekly_tasks_source_check;

alter table public.weekly_tasks
  add constraint weekly_tasks_source_check
  check (source in ('coach', 'ai', 'student'));

create or replace function public.tasks_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if not public.is_coach() then
    if new.student_id <> old.student_id
       or (new.task_date <> old.task_date and coalesce(current_setting('app.resched', true), '') <> '1')
       or new.title <> old.title
       or new.subject is distinct from old.subject
       or new.amount is distinct from old.amount
       or new.week_title is distinct from old.week_title
       or new.source <> old.source
       or new.created_by is distinct from old.created_by then
      raise exception 'Öğrenci yalnızca tamamlandı durumunu değiştirebilir';
    end if;
    new.done_at := case when new.done then coalesce(old.done_at, now()) else null end;
  end if;
  return new;
end
$$;
