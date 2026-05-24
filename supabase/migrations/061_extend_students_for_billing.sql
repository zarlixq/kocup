-- ─────────────────────────────────────────────────────────────────────────
-- 061 — students tablosunu muhasebe + kayıt kaynağı alanlarıyla genişlet
-- ─────────────────────────────────────────────────────────────────────────
-- Tek öğrenci tablosu için gereken alanlar. profiles'ta zaten olan
-- (full_name, email, phone) tekrar edilmez — JOIN ile alınır.
--
-- kayit_kaynagi: koç eklediğinde 'koc_ekledi', başvuru onaylandığında 'basvuru'.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.students
  add column if not exists kayit_kaynagi text not null default 'basvuru'
    check (kayit_kaynagi in ('basvuru', 'koc_ekledi')),
  add column if not exists school        text,
  add column if not exists notes         text,
  add column if not exists is_active     boolean not null default true;

create index if not exists students_is_active_idx on public.students (is_active);
create index if not exists students_kayit_kaynagi_idx on public.students (kayit_kaynagi);
