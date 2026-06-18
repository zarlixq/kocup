-- Başvuru formuna LGS/YKS segmenti.
-- segment NULL olabilir (segment seçilmeden gönderilen / eski başvurular için).
-- Not: Bu migration'ı ÇALIŞTIRMAK kullanıcıya aittir (kod tarafı hazırdır).
alter table public.applications
  add column if not exists segment text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'applications_segment_check'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_segment_check
      check (segment is null or segment in ('lgs', 'yks'));
  end if;
end $$;
