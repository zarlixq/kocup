-- /kurumlar demo talep formuna "İl" alanı eklendi.
alter table public.institution_inquiries add column if not exists city text;
