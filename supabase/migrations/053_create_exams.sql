-- ─────────────────────────────────────────────────────────────────────────
-- EXAMS — deneme meta (her satır bir deneme, ders sonuçları exam_results'ta)
-- ─────────────────────────────────────────────────────────────────────────
create table public.exams (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  exam_type  text not null check (exam_type in ('tyt', 'ayt', 'tyt_ayt')),
  date       date not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.exams enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.exams (student_id);
create index on public.exams (student_id, date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
create policy "exams_select" on public.exams
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "exams_insert" on public.exams
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "exams_update" on public.exams
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "exams_delete" on public.exams
  for delete using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
