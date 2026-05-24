-- ─────────────────────────────────────────────────────────────────────────
-- 060 — Eski muhasebe modülünü kaldır
-- ─────────────────────────────────────────────────────────────────────────
-- Hedef: clients + coaches tabloları ile bunlara bağımlı payments/packages
-- DROP edilir. payments/packages 062'de yeniden kurulur (students FK ile).
-- coaches kavramı kalkıyor — tek koç kaynağı profiles.role='coach' olacak.
--
-- handle_new_coach trigger ve fonksiyonu da kalkar; profile oluşturma
-- handle_new_user (040 migration) tarafından zaten yapılıyor.
-- ─────────────────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_coach();

drop table if exists public.payments cascade;
drop table if exists public.packages cascade;
drop table if exists public.clients  cascade;
drop table if exists public.coaches  cascade;
