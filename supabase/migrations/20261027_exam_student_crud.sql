-- Existing Supabase deployments: align exam edit/delete permissions with the student UI.
-- Students may manage only their own exam rows; RLS prevents changing ownership.
drop policy if exists "exam_student_update" on public.exam_results;
create policy "exam_student_update"
  on public.exam_results
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "exam_student_delete" on public.exam_results;
create policy "exam_student_delete"
  on public.exam_results
  for delete
  using (student_id = auth.uid());
