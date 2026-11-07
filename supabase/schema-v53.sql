-- v5.3: Öğrenci Analiz → Denemeler sayfasında "Yaklaşan denemeler" kartı, koçun deneme_plan'da işaretlediği denemeleri gösterir.
-- Öğrenci yalnızca OKUR (ekleme/değiştirme/silme hâlâ yalnız koç: deneme_plan_coach_all). Yalnızca ekleme yapar; drop/revoke yok.
create policy deneme_plan_student_select on public.deneme_plan for select to authenticated
  using (true);
