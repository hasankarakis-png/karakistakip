-- v4.9: haftalık plan takibi yeniden tasarımı — koç notu ve koç onayı
-- Yalnızca ekleme: yeni sütunlar + tasks_guard'a iki koruma (öğrenci bu alanları değiştiremez, tamamlandı işaretini değiştirmeye devam eder).
alter table public.weekly_tasks add column if not exists coach_note text;
alter table public.weekly_tasks add column if not exists coach_ok boolean not null default false;
alter table public.weekly_tasks add column if not exists coach_ok_at timestamptz;

create or replace function public.tasks_guard() returns trigger language plpgsql set search_path to 'public' as $$
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
       or new.carried_from is distinct from old.carried_from
       or new.coach_note is distinct from old.coach_note
       or new.coach_ok is distinct from old.coach_ok
       or new.coach_ok_at is distinct from old.coach_ok_at then
      raise exception 'Öğrenci yalnızca tamamlandı durumunu değiştirebilir';
    end if;
    new.done_at := case when new.done then coalesce(old.done_at, now()) else null end;
  end if;
  return new;
end $$;
