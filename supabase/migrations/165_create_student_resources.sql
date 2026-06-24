-- ─────────────────────────────────────────────────────────────────────────
-- STUDENT_RESOURCES — öğrenciye atanmış kaynaklar (student_topics deseni)
-- Hem koç hem öğrenci ekler (added_by ile kim ekledi belli).
-- ─────────────────────────────────────────────────────────────────────────
create table public.student_resources (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  status      text not null default 'aktif' check (status in ('aktif', 'bitti', 'birakildi')),
  added_by    text not null check (added_by in ('coach', 'student')),
  started_at  date,
  created_at  timestamptz default now(),
  unique (student_id, resource_id)
);

alter table public.student_resources enable row level security;

create index on public.student_resources (student_id);

-- RLS: öğrenci kendi + koçu + admin (study_sessions deseni;
-- silmeye öğrencinin kendisi de dahil — kendi kaynak listesini düzenleyebilsin)
create policy "student_resources_select" on public.student_resources
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_resources_insert" on public.student_resources
  for insert with check (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_resources_update" on public.student_resources
  for update using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );

create policy "student_resources_delete" on public.student_resources
  for delete using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
  );
