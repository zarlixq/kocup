-- ─────────────────────────────────────────────────────────────────────────
-- 217 — UpPlan: sürekli pratik hedefleri
-- ─────────────────────────────────────────────────────────────────────────
-- Paragraf, problemler gibi konular öğrenme aşamasından sonra "tamamlandı"
-- olup çıkmaz; sınava kadar her hafta pratik bloğu alır, aktif konu sınırına
-- sayılmaz (lib/upplan/config.ts PRACTICE_GROUPS). block_type CHECK'ini
-- değiştirmek DROP gerektirdiği için ayrı, yıkıcı olmayan bir bayrak.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.topic_assignments add column if not exists is_practice boolean not null default false;
