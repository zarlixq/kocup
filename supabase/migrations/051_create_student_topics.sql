-- ─────────────────────────────────────────────────────────────────────────
-- STUDENT_TOPICS — öğrenciye atanmış konular (global topic veya custom)
-- ─────────────────────────────────────────────────────────────────────────
create table public.student_topics (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  topic_id          uuid references public.topics(id) on delete set null,
  custom_name       text,
  custom_subject_id uuid references public.subjects(id),
  status            text not null default 'basla'
                    check (status in ('basla', 'devam', 'tamam', 'tekrar')),
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  check (topic_id is not null
         or (custom_name is not null and custom_subject_id is not null))
);

alter table public.student_topics enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────
create index on public.student_topics (student_id);
create index on public.student_topics (student_id, status);
create index on public.student_topics (topic_id);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
create policy "student_topics_select" on public.student_topics
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_topics_insert" on public.student_topics
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_topics_update" on public.student_topics
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_topics_delete" on public.student_topics
  for delete using (
    public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
