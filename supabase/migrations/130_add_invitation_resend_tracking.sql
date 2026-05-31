-- ─────────────────────────────────────────────────────────────────────────
-- 130 — Davet linki yeniden gönderme cooldown'u
-- ─────────────────────────────────────────────────────────────────────────
-- profiles.last_invitation_sent_at: en son ne zaman davet linki gönderildi.
-- Server action 5 dakikalık cool-down kontrolü için kullanır.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists last_invitation_sent_at timestamptz;
