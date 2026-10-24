-- ─────────────────────────────────────────────────────────────────────────
-- 230 — UpPlan: kısa tekrar bloğunun en kısa süresi (25-30 dk aralığı)
-- ─────────────────────────────────────────────────────────────────────────
-- lib/upplan/config.ts UPPLAN_TRACK_SQL_CONFIG ile senkron (config.test.ts).
insert into public.upplan_config (key, value, note) values
  ('short_review_min_minutes', 25, 'Kısa tekrar en kısa (dk): 30 dk boşluk yoksa')
on conflict (key) do nothing;
