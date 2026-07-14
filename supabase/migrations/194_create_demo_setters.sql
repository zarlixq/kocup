-- ─────────────────────────────────────────────────────────────────────────
-- 194 — demo_setters: demoyu "kim ayarladı" isim kataloğu + FK
-- ─────────────────────────────────────────────────────────────────────────
-- Bu kişiler sistem kullanıcısı DEĞİL (auth hesabı yok, dışarıdan demo bağlayan
-- arkadaşlar/outreach ekibi) → auth.users'a bağlanmaz, basit isim kataloğu.
-- İsim silme yerine is_active=false (soft) → geçmiş randevu gösterimi bozulmaz.
--
-- Kapsam: SADECE super-admin (sales_leads_admin_all / demo_appointments deseni).
--
-- ROLLBACK:
--   alter table public.demo_appointments drop column if exists set_by_id;
--   drop table if exists public.demo_setters;
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.demo_setters (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_by uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.demo_setters enable row level security;

create policy "demo_setters_admin_all" on public.demo_setters
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Demoyu kim ayarladı (nullable — eski/atanmamış randevular boş kalabilir).
-- Setter silinse bile randevu kaydı kalır → on delete set null.
alter table public.demo_appointments
  add column if not exists set_by_id uuid
    references public.demo_setters(id) on delete set null;

create index if not exists demo_appointments_set_by_id_idx
  on public.demo_appointments (set_by_id);
