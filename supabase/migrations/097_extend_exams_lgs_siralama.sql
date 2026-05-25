-- ─────────────────────────────────────────────────────────────────────────
-- EXAMS — LGS + okul denemesi desteği + siralama + notes
-- ─────────────────────────────────────────────────────────────────────────

alter table public.exams drop constraint if exists exams_exam_type_check;

alter table public.exams
  add constraint exams_exam_type_check
  check (exam_type in ('tyt', 'ayt', 'tyt_ayt', 'lgs', 'okul'));

alter table public.exams
  add column if not exists siralama integer
    check (siralama is null or siralama > 0);

alter table public.exams
  add column if not exists notes text;
