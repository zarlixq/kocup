-- profiles tablosuna koç bilgi alanlarını ekle
alter table public.profiles
  add column if not exists bio text,
  add column if not exists certificate_info text,
  add column if not exists years_experience integer check (years_experience is null or years_experience >= 0),
  add column if not exists specialties text[];
