-- ─────────────────────────────────────────────────────────────────────────
-- 193 — demo_appointments: satış CRM demo randevu takibi
-- ─────────────────────────────────────────────────────────────────────────
-- KOÇ-ÖĞRENCI 'appointments' TABLOSUNDAN AYRIDIR — bu satış demo domaini.
-- lead_id → sales_leads (CRM prospect). Lead silinirse demo randevuları da
-- anlamsız kalır → on delete cascade. rescheduled_from_id → self FK (no-show
-- zinciri); eski randevu silinmez, yalnız status='rescheduled' olur.
--
-- Kapsam: SADECE super-admin (sales_leads_admin_all deseni birebir).
--
-- ROLLBACK:
--   drop table if exists public.demo_appointments;
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.demo_appointments (
  id                  uuid        primary key default gen_random_uuid(),
  lead_id             uuid        not null references public.sales_leads(id) on delete cascade,
  scheduled_at        timestamptz not null,
  status              text        not null default 'scheduled'
                                  check (status in ('scheduled','completed','no_show','cancelled','rescheduled')),
  showed_up           boolean,
  notes               text,
  outcome             text        check (outcome is null or outcome in ('interested','follow_up','closed_won','closed_lost')),
  rescheduled_from_id uuid        references public.demo_appointments(id) on delete set null,
  created_by          uuid        references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists demo_appointments_lead_id_idx on public.demo_appointments (lead_id);
create index if not exists demo_appointments_scheduled_at_idx on public.demo_appointments (scheduled_at);
create index if not exists demo_appointments_status_idx on public.demo_appointments (status);

alter table public.demo_appointments enable row level security;

-- Super-admin her şeyi yönetir (sales_leads_admin_all ile birebir aynı kapsam)
create policy "demo_appointments_admin_all" on public.demo_appointments
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create trigger trg_demo_appointments_updated_at
  before update on public.demo_appointments
  for each row execute function public.set_updated_at();
