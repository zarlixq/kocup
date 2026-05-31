-- ─────────────────────────────────────────────────────────────────────────
-- 160 — Konu bazlı soru çözüm + hata takibi
-- ─────────────────────────────────────────────────────────────────────────
-- student_topics tablosuna 3 kolon ekler:
--   - solved_count: o konuda toplam çözülen soru sayısı
--   - wrong_count : o konuda yapılan toplam yanlış sayısı (solved'i geçemez)
--   - error_notes : öğrencinin zorlandığı yerlerin serbest metin notu
--
-- Güvenlik: Mevcut RLS update policy zaten öğrenci=kendi / koç=öğrencisinin /
-- admin senaryolarını kapsıyor, ek policy gerekmez. Trigger update_at için
-- mevcut updated_at zaten manuel set ediliyor.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.student_topics
  add column if not exists solved_count integer not null default 0,
  add column if not exists wrong_count  integer not null default 0,
  add column if not exists error_notes  text;

-- Veri tutarlılığı: yanlış sayısı çözülenden büyük olamaz, ikisi de negatif olamaz
alter table public.student_topics
  drop constraint if exists student_topics_progress_check;

alter table public.student_topics
  add constraint student_topics_progress_check
    check (
      solved_count >= 0
      and wrong_count >= 0
      and wrong_count <= solved_count
    );
