-- ─────────────────────────────────────────────────────────────────────────
-- EXAM_RESULTS — deneme içindeki ders bazlı sonuçlar; net stored generated
-- ─────────────────────────────────────────────────────────────────────────
create table public.exam_results (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  correct    int  not null check (correct >= 0),
  wrong      int  not null check (wrong >= 0),
  empty      int  not null check (empty >= 0),
  net        numeric generated always as (correct - wrong / 4.0) stored,
  unique (exam_id, subject_id)
);

alter table public.exam_results enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.exam_results (exam_id);
create index on public.exam_results (subject_id);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — exams üzerinden join'le yetki kontrolü
-- ─────────────────────────────────────────────────────────────────────────
create policy "exam_results_select" on public.exam_results
  for select using (public.exam_belongs_to_visible_student(exam_id));

create policy "exam_results_insert" on public.exam_results
  for insert with check (public.exam_belongs_to_visible_student(exam_id));

create policy "exam_results_update" on public.exam_results
  for update using (public.exam_belongs_to_visible_student(exam_id));

create policy "exam_results_delete" on public.exam_results
  for delete using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id
        and (public.is_coach_of(e.student_id)
             or public.current_user_role() = 'admin')
    )
  );
