-- ─────────────────────────────────────────────────────────────────────────
-- 198 — Öğrenci kendi kayıtlarını düzenleyip silebilir + UPDATE sızıntısı kapandı
-- ─────────────────────────────────────────────────────────────────────────
-- SORUN 1: 052/053'teki delete policy'leri yalnızca koç + admin'e açıktı.
--   Öğrenci panelindeki "Sil" butonu 0 satır etkiliyordu ve hata dönmediği
--   için sessizce başarısız oluyordu. Öğrenci kendi kaydını silebilmeli.
--
-- SORUN 2: update policy'lerinde WITH CHECK yoktu. USING yalnızca "hangi
--   satıra dokunabilirim"i kısıtlar; WITH CHECK olmadan öğrenci kendi
--   kaydının student_id'sini BAŞKA bir öğrenciye taşıyabilirdi (cross-org
--   veri enjeksiyonu). USING ile aynı ifade WITH CHECK olarak da eklenir.
--
-- Koç (is_coach_of), admin ve org_admin dalları AYNEN korunur → mevcut
-- koç/kurum akışı değişmez, org_admin hâlâ readonly.
-- ─────────────────────────────────────────────────────────────────────────

-- ── study_sessions ───────────────────────────────────────────────────────
drop policy if exists "study_sessions_delete" on public.study_sessions;
create policy "study_sessions_delete" on public.study_sessions
  for delete using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

drop policy if exists "study_sessions_update" on public.study_sessions;
create policy "study_sessions_update" on public.study_sessions
  for update
  using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  )
  with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

-- ── exams ────────────────────────────────────────────────────────────────
drop policy if exists "exams_delete" on public.exams;
create policy "exams_delete" on public.exams
  for delete using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

drop policy if exists "exams_update" on public.exams;
create policy "exams_update" on public.exams
  for update
  using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  )
  with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

-- ── exam_results ─────────────────────────────────────────────────────────
-- Deneme düzenlemesinde ders satırları delete + insert ile replace edilir;
-- öğrencinin kendi denemesinin satırlarını silebilmesi gerekir. Yetki
-- kontrolü mevcut helper'a devredilir (öğrenci + koç + admin kapsar).
drop policy if exists "exam_results_delete" on public.exam_results;
create policy "exam_results_delete" on public.exam_results
  for delete using (public.exam_belongs_to_visible_student(exam_id));

drop policy if exists "exam_results_update" on public.exam_results;
create policy "exam_results_update" on public.exam_results
  for update
  using (public.exam_belongs_to_visible_student(exam_id))
  with check (public.exam_belongs_to_visible_student(exam_id));
