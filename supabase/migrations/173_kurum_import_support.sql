-- ─────────────────────────────────────────────────────────────────────────
-- KURUM YÖNETİMİ + GEÇİCİ ŞİFRELİ TOPLU IMPORT
-- B2C bozulmaz: must_change_password default false → mevcut/bireysel herkes muaf.
-- ─────────────────────────────────────────────────────────────────────────

-- İlk girişte zorunlu şifre değiştirme bayrağı (sadece kurum-import öğrencilerinde true)
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Kurum importu kayıt kaynağı
alter table public.students drop constraint if exists students_kayit_kaynagi_check;
alter table public.students add constraint students_kayit_kaynagi_check
  check (kayit_kaynagi in ('basvuru', 'koc_ekledi', 'kurum_import'));

-- Import işi: mod (mail daveti / geçici şifre) + hedef koç
alter table public.import_jobs
  add column if not exists mode text not null default 'invite'
    check (mode in ('invite', 'password')),
  add column if not exists coach_id uuid references public.profiles(id) on delete set null;

-- Üretilen/ortak geçici şifre (Mod B indirme listesi + resume için)
alter table public.import_rows
  add column if not exists generated_password text;
