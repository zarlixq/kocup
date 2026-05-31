-- ─────────────────────────────────────────────────────────────────────────
-- 150 — Bildirim tercihleri (UI hazır, backend ileride)
-- ─────────────────────────────────────────────────────────────────────────
-- profiles.notification_preferences: kullanıcının bildirim tercihlerini
-- JSONB olarak saklar. Bildirim sistemi (B1) eklendiğinde bu kolon okunur.
-- Default boş object → kullanıcının default'lar (hepsi açık) ile çalışır.
--
-- Şu anlık kullanılan key'ler (öğrenci paneli):
--   - mesaj_kocum: koçtan mesaj geldiğinde (default true)
--   - yeni_konu: koç yeni konu atadığında (default true)
--   - randevu_hatirlat: randevu hatırlatması (default true)
--   - haftalik_ozet: haftalık özet emaili (default false)
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists notification_preferences jsonb
    not null default '{}'::jsonb;
