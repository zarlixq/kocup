-- ─────────────────────────────────────────────────────────────────────────
-- 181 — org_admin readonly zengin öğrenci detayı için eksik SELECT policy'leri
-- ─────────────────────────────────────────────────────────────────────────
-- Migration 120, org_admin için study_sessions/exams/appointments/topic_assignments
-- SELECT policy'leri ekledi ama student_topics ve exam_results ATLANMIŞTI.
-- Bu yüzden org_admin öğrenci detayında "Konu" (0/0), "Son Deneme Net" ve deneme
-- trend grafiği boş kalıyordu (müdür=admin tam görüyor, org_admin göremiyor).
--
-- Yalnızca SELECT policy eklenir → org_admin READONLY kalır (update/delete hâlâ
-- koç + admin'e kısıtlı). Mevcut org_admin_select desenini birebir izler.
-- ─────────────────────────────────────────────────────────────────────────

-- student_topics: org_admin kurum öğrencilerinin konu durumlarını okur
drop policy if exists "student_topics_org_admin_select" on public.student_topics;
create policy "student_topics_org_admin_select" on public.student_topics
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = student_topics.student_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

-- exam_results: org_admin kurum öğrencilerinin deneme sonuçlarını okur
-- (exam_id → exams.student_id → profiles.organization_id)
drop policy if exists "exam_results_org_admin_select" on public.exam_results;
create policy "exam_results_org_admin_select" on public.exam_results
  for select using (
    exists (
      select 1
      from public.exams e
      join public.profiles p on p.id = e.student_id
      where e.id = exam_results.exam_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );
