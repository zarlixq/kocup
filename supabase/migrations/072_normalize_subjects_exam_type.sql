-- subjects.exam_type'ı lowercase'e normalize et (form 'tyt'/'ayt' bekliyordu, db 'TYT'/'AYT' tutuyordu)
alter table public.subjects drop constraint if exists subjects_exam_type_check;
update public.subjects set exam_type = lower(exam_type) where exam_type in ('TYT','AYT');
alter table public.subjects add constraint subjects_exam_type_check
  check (exam_type in ('tyt', 'ayt'));
