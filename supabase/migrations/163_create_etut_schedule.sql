-- ─────────────────────────────────────────────────────────────────────────
-- ETUT_SCHEDULE — haftalık etüt programı (schedule'ın birebir klonu)
-- Ayrı tablo: ileride etüde özel alan eklenince programı (schedule) bozmaz.
-- Yapı + RLS schedule (056) ile aynı; mevcut helper'lar yeniden tanımlanmaz.
-- ─────────────────────────────────────────────────────────────────────────
create table public.etut_schedule (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  term         int  not null check (term in (1, 2)),
  day_of_week  int  not null check (day_of_week between 1 and 7),
  start_time   time not null,
  end_time     time not null,
  subject_id   uuid references public.subjects(id),
  custom_title text,
  notes        text,
  created_at   timestamptz default now(),
  check (subject_id is not null or custom_title is not null),
  check (end_time > start_time)
);

alter table public.etut_schedule enable row level security;

create index on public.etut_schedule (student_id, term, day_of_week);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS (schedule ile aynı: öğrenci + koçu + admin; silme sadece koç + admin)
-- ─────────────────────────────────────────────────────────────────────────
create policy "etut_schedule_select" on public.etut_schedule
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "etut_schedule_insert" on public.etut_schedule
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "etut_schedule_update" on public.etut_schedule
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "etut_schedule_delete" on public.etut_schedule
  for delete using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
