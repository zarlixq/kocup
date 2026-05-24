-- ─────────────────────────────────────────────────────────────────────────
-- STUDY_SESSIONS — günlük soru çözüm kayıtları
-- ─────────────────────────────────────────────────────────────────────────
create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  subject_id       uuid not null references public.subjects(id),
  date             date not null,
  total_questions  int  not null check (total_questions >= 0),
  correct          int  not null check (correct >= 0),
  wrong            int  not null check (wrong >= 0),
  empty            int  not null check (empty >= 0),
  duration_minutes int  check (duration_minutes is null or duration_minutes >= 0),
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz default now(),
  check (total_questions = correct + wrong + empty)
);

alter table public.study_sessions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.study_sessions (student_id);
create index on public.study_sessions (student_id, date desc);
create index on public.study_sessions (student_id, subject_id, date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
create policy "study_sessions_select" on public.study_sessions
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "study_sessions_insert" on public.study_sessions
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "study_sessions_update" on public.study_sessions
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "study_sessions_delete" on public.study_sessions
  for delete using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
