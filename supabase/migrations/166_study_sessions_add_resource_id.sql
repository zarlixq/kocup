-- ─────────────────────────────────────────────────────────────────────────
-- study_sessions → resources soft-link (096'daki assignment_id deseni)
-- Nullable: eski kayıtlar bozulmaz. RLS değişmez (mevcut policy'ler kapsar).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.study_sessions
  add column if not exists resource_id uuid
    references public.resources(id) on delete set null;

create index if not exists study_sessions_resource_id_idx
  on public.study_sessions (resource_id);
