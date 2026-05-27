-- ─────────────────────────────────────────────────────────────────────────
-- 111 — Performans index'leri (audit P-5)
-- ─────────────────────────────────────────────────────────────────────────
-- Sık filtrelenen kolonlar için index. Mevcut tek-kolon index'ler korunuyor;
-- composite olanlar daha selektif query plan üretir.
-- ─────────────────────────────────────────────────────────────────────────

-- students: coach_id + is_active sık birlikte filtrelenir
create index if not exists students_coach_active_idx
  on public.students (coach_id, is_active);

-- appointments: coach paneli dashboard "bugünkü randevular" + filtrelemeler
create index if not exists appointments_coach_status_start_idx
  on public.appointments (coach_id, status, start_time);

-- study_sessions: koç oluşturduğu session'lar query'lerinde kullanılır
create index if not exists study_sessions_created_by_idx
  on public.study_sessions (created_by)
  where created_by is not null;

-- exams: aynı şekilde koç oluşturduğu denemeler
create index if not exists exams_created_by_idx
  on public.exams (created_by)
  where created_by is not null;

-- topic_assignments: created_by koç=author senaryosunda
create index if not exists topic_assignments_created_by_idx
  on public.topic_assignments (created_by)
  where created_by is not null;

-- applications: status + created_at sort (recent panel)
create index if not exists applications_status_created_at_idx
  on public.applications (status, created_at desc);

-- payments: period_month aggregate'lar (dashboard "bu ay tahsil edilen")
create index if not exists payments_period_month_idx
  on public.payments (period_month);
