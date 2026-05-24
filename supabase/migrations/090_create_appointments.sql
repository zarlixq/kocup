-- ─────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS — Randevu sistemi
-- ─────────────────────────────────────────────────────────────────────────

-- Enum types
create type public.appointment_type as enum ('tanitim', 'koc_gorusme', 'veli_gorusme', 'ozel');
create type public.appointment_status as enum ('planlandi', 'tamamlandi', 'iptal', 'gelmedi');

-- updated_at helper trigger function (proje genelinde kullanılabilir)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),

  -- Katılımcılar
  coach_id       uuid not null references public.profiles(id) on delete cascade,
  student_id     uuid          references public.profiles(id) on delete cascade,
  application_id uuid          references public.applications(id) on delete set null,

  -- Detaylar
  title  text                       not null,
  type   public.appointment_type    not null default 'koc_gorusme',
  status public.appointment_status  not null default 'planlandi',

  -- Zaman
  start_time timestamptz not null,
  end_time   timestamptz not null,

  -- Tekrarlama
  is_recurring          boolean not null default false,
  recurrence_rule       text,                                -- 'weekly' | 'biweekly'
  recurrence_end_date   date,
  parent_appointment_id uuid references public.appointments(id) on delete cascade,

  -- Toplantı linki + notlar
  meeting_link  text,
  meeting_notes text,
  notes         text,
  summary       text,

  -- Meta
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint appointments_end_after_start check (end_time > start_time),
  constraint appointments_recurrence_rule_required check (
    is_recurring = false or recurrence_rule is not null
  )
);

-- Indexes
create index on public.appointments (coach_id, start_time desc);
create index on public.appointments (student_id, start_time desc);
create index on public.appointments (application_id);
create index on public.appointments (status, start_time);
create index on public.appointments (parent_appointment_id);

-- updated_at trigger
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table public.appointments enable row level security;

-- Koç kendi randevularını tam yönetir
create policy "appointments_coach_all" on public.appointments
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Öğrenci sadece kendi randevularını okur
-- (tanıtım dersinde student_id NULL → öğrenci görmez, doğru davranış)
create policy "appointments_student_read" on public.appointments
  for select
  using (student_id = auth.uid());

-- Admin (müdür) her şeyi yönetir
create policy "appointments_admin_all" on public.appointments
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
