-- Başvuru formuna 7. ve 8. sınıf (LGS) seçenekleri için CHECK constraint güncelle
alter table public.applications drop constraint if exists applications_grade_check;
alter table public.applications add constraint applications_grade_check
  check (grade in ('7', '8', '9', '10', '11', '12', 'Mezun'));
