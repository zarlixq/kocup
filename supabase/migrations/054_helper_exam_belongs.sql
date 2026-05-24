-- ─────────────────────────────────────────────────────────────────────────
-- HELPER: exam_belongs_to_visible_student
-- exam_results tablosunda student_id doğrudan yok; yetki kontrolü
-- exams üzerinden join'le yapılır. Bu fonksiyon RLS politikalarında
-- çağırılır (security definer + stable).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.exam_belongs_to_visible_student(p_exam_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.exams e
    where e.id = p_exam_id
      and (
        e.student_id = auth.uid()
        or public.is_coach_of(e.student_id)
        or public.current_user_role() = 'admin'
      )
  )
$$;
