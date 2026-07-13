-- ─────────────────────────────────────────────────────────────────────────
-- PLATFORM-seviyesi başvuru tabloları (org_id YOK). Sadece super-admin (admin)
-- okur/günceller; public form anon INSERT yapar. institution_inquiries deseni.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Koç başvuruları: bireysel koç KoçUp paneli almak istiyor
create table if not exists public.koc_applications (
  id           uuid primary key default gen_random_uuid(),
  ad_soyad     text not null,
  telefon      text not null,
  email        text,
  brans        text,
  deneyim_yili integer,
  mesaj        text,
  cv_url       text,
  status       text not null default 'yeni'
    check (status in ('yeni','degerlendirmede','onaylandi','reddedildi')),
  created_at   timestamptz not null default now()
);

alter table public.koc_applications enable row level security;

drop policy if exists "koc_applications_insert_public" on public.koc_applications;
create policy "koc_applications_insert_public" on public.koc_applications
  for insert with check (true);

drop policy if exists "koc_applications_admin_all" on public.koc_applications;
create policy "koc_applications_admin_all" on public.koc_applications
  for all using (public.current_user_role() = 'admin');

create index if not exists idx_koc_applications_created_at
  on public.koc_applications (created_at desc);

-- 2) Öğrenci başvuruları: öğrenci bizim koçlarımızdan hizmet almak istiyor
create table if not exists public.ogrenci_applications (
  id          uuid primary key default gen_random_uuid(),
  ogrenci_ad  text not null,
  veli_ad     text,
  telefon     text not null,
  sinif       text,
  hedef       text,
  mesaj       text,
  status      text not null default 'yeni'
    check (status in ('yeni','degerlendirmede','onaylandi','reddedildi')),
  created_at  timestamptz not null default now()
);

alter table public.ogrenci_applications enable row level security;

drop policy if exists "ogrenci_applications_insert_public" on public.ogrenci_applications;
create policy "ogrenci_applications_insert_public" on public.ogrenci_applications
  for insert with check (true);

drop policy if exists "ogrenci_applications_admin_all" on public.ogrenci_applications;
create policy "ogrenci_applications_admin_all" on public.ogrenci_applications
  for all using (public.current_user_role() = 'admin');

create index if not exists idx_ogrenci_applications_created_at
  on public.ogrenci_applications (created_at desc);

-- 3) institution_inquiries (Kurum/demo talepleri) status değerlerini Türkçe akışa hizala
update public.institution_inquiries set status = 'yeni' where status = 'new';
alter table public.institution_inquiries alter column status set default 'yeni';
alter table public.institution_inquiries
  drop constraint if exists institution_inquiries_status_check;
alter table public.institution_inquiries
  add constraint institution_inquiries_status_check
  check (status in ('yeni','incelendi','gorusuldu','kapandi'));
