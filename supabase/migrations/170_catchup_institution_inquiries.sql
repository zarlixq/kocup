-- ─────────────────────────────────────────────────────────────────────────
-- CATCH-UP: institution_inquiries (B2B kurum demo talep formu). Idempotent.
-- /kurumlar demo formu public INSERT yapar; müdür yönetir.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.institution_inquiries (
  id               uuid primary key default gen_random_uuid(),
  institution_name text not null,
  full_name        text not null,
  phone            text not null,
  email            text,
  student_count    text,
  coach_count      text,
  message          text,
  status           text not null default 'new',
  created_at       timestamptz default now()
);

alter table public.institution_inquiries enable row level security;

drop policy if exists "institution_inquiries_insert_public" on public.institution_inquiries;
create policy "institution_inquiries_insert_public" on public.institution_inquiries
  for insert with check (true);

drop policy if exists "institution_inquiries_admin_all" on public.institution_inquiries;
create policy "institution_inquiries_admin_all" on public.institution_inquiries
  for all using (public.current_user_role() = 'admin');
