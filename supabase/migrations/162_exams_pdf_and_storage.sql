-- ─────────────────────────────────────────────────────────────────────────
-- DENEME PDF EKİ
-- exams tablosuna opsiyonel PDF dosyası path'i + private Storage bucket.
-- OCR/parse YOK — dosya sadece saklanır ve signed URL ile gösterilir.
-- Net hesabı değişmez (exam_results.net generated column'a dokunulmaz).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.exams add column if not exists pdf_path text;

-- Private bucket (public=false → erişim sadece signed URL + RLS ile)
insert into storage.buckets (id, name, public)
values ('exam-pdfs', 'exam-pdfs', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage RLS (storage.objects) — yol şeması: {student_id}/{exam_id}.pdf
-- Erişim: öğrenci kendi + koçu + admin (exams tablosu RLS'i ile aynı desen)
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "exam_pdfs_select" on storage.objects;
drop policy if exists "exam_pdfs_insert" on storage.objects;
drop policy if exists "exam_pdfs_update" on storage.objects;
drop policy if exists "exam_pdfs_delete" on storage.objects;

create policy "exam_pdfs_select" on storage.objects
  for select using (
    bucket_id = 'exam-pdfs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
      or public.current_user_role() = 'admin'
    )
  );

create policy "exam_pdfs_insert" on storage.objects
  for insert with check (
    bucket_id = 'exam-pdfs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
      or public.current_user_role() = 'admin'
    )
  );

create policy "exam_pdfs_update" on storage.objects
  for update using (
    bucket_id = 'exam-pdfs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
      or public.current_user_role() = 'admin'
    )
  );

create policy "exam_pdfs_delete" on storage.objects
  for delete using (
    bucket_id = 'exam-pdfs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
      or public.current_user_role() = 'admin'
    )
  );
