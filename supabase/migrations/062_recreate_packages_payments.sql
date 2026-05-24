-- ─────────────────────────────────────────────────────────────────────────
-- 062 — packages + payments tablolarını yeniden kur (students FK ile)
-- ─────────────────────────────────────────────────────────────────────────
-- Şema eski 20260522 migration ile aynı kolonlar; tek fark student_id
-- artık public.students(id) (profiles tabanlı) tablosuna FK.
-- ─────────────────────────────────────────────────────────────────────────

create table public.packages (
  id            uuid          primary key default gen_random_uuid(),
  student_id    uuid          not null references public.students(id) on delete cascade,
  name          text          not null,
  monthly_price numeric(10,2) not null,
  start_date    date          not null,
  end_date      date,
  payment_day   int           not null default 1 check (payment_day between 1 and 31),
  status        text          not null default 'active' check (status in ('active','paused','ended')),
  notes         text,
  created_at    timestamptz   not null default now()
);

create table public.payments (
  id           uuid          primary key default gen_random_uuid(),
  package_id   uuid          not null references public.packages(id) on delete cascade,
  student_id   uuid          not null references public.students(id) on delete cascade,
  amount       numeric(10,2) not null,
  payment_date date          not null,
  period_month date          not null,
  method       text,
  notes        text,
  created_at   timestamptz   not null default now()
);

create index packages_student_id_idx     on public.packages (student_id);
create index payments_student_id_idx     on public.payments (student_id);
create index payments_package_id_idx     on public.payments (package_id);
create index payments_period_month_idx   on public.payments (period_month);
