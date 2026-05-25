-- ─────────────────────────────────────────────────────────────────────────
-- study_sessions <-> topic_assignments bağlantısı
-- assignment_id NULL bırakılabilir (serbest soru çözüm), SET NULL ile soft-link.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.study_sessions
  add column if not exists assignment_id uuid
    references public.topic_assignments(id) on delete set null;

create index if not exists study_sessions_assignment_id_idx
  on public.study_sessions (assignment_id);
