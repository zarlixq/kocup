-- ─────────────────────────────────────────────────────────────────────────
-- SCHEDULE — haftalık ders programı (1. ve 2. dönem)
-- ─────────────────────────────────────────────────────────────────────────
create table public.schedule (
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

alter table public.schedule enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.schedule (student_id, term, day_of_week);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
create policy "schedule_select" on public.schedule
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "schedule_insert" on public.schedule
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "schedule_update" on public.schedule
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "schedule_delete" on public.schedule
  for delete using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
