-- ─────────────────────────────────────────────────────────────────────────
-- 063 — RLS: birleşik students + packages + payments
-- ─────────────────────────────────────────────────────────────────────────
-- 040'ta tanımlı students RLS'ine eksik INSERT/DELETE policy'leri eklenir
-- (koç kendi öğrencisini ekler/siler, admin hepsini).
-- packages + payments için koç-scoped RLS (öğrenci üzerinden).
-- ─────────────────────────────────────────────────────────────────────────

-- ─── students: INSERT (koç + admin) ────────────────────────────────────
create policy "students_insert_coach" on public.students
  for insert with check (
    coach_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─── students: DELETE (koç kendi öğrencisini, admin hepsini) ───────────
create policy "students_delete_coach" on public.students
  for delete using (
    coach_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─── packages ──────────────────────────────────────────────────────────
alter table public.packages enable row level security;

create policy "packages_coach_select" on public.packages
  for select using (
    exists (
      select 1 from public.students s
      where s.id = packages.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "packages_coach_insert" on public.packages
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = packages.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "packages_coach_update" on public.packages
  for update using (
    exists (
      select 1 from public.students s
      where s.id = packages.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  ) with check (
    exists (
      select 1 from public.students s
      where s.id = packages.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "packages_coach_delete" on public.packages
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = packages.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

-- ─── payments ──────────────────────────────────────────────────────────
alter table public.payments enable row level security;

create policy "payments_coach_select" on public.payments
  for select using (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "payments_coach_insert" on public.payments
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "payments_coach_update" on public.payments
  for update using (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  ) with check (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

create policy "payments_coach_delete" on public.payments
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and (s.coach_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );
