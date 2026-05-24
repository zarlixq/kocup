-- ─────────────────────────────────────────────────────────────────────────
-- APPLICATIONS — Tanıtım dersi akışı için ek alan ve yeni status değerleri
-- ─────────────────────────────────────────────────────────────────────────

-- Tanıtım dersi randevusu ile bağlantı
alter table public.applications
  add column if not exists tanitim_appointment_id uuid
    references public.appointments(id) on delete set null;

create index if not exists applications_tanitim_appointment_id_idx
  on public.applications (tanitim_appointment_id);

-- Status CHECK constraint'i yenile (ENUM değil TEXT+CHECK olduğu için drop+add yeterli)
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'pending',
    'tanitim_planlandi',
    'tanitim_tamamlandi',
    'approved',
    'rejected'
  ));
