-- ─────────────────────────────────────────────────────────────────────────
-- 229 — UpPlan track katsayıları (ek): Maarif önceliği ve alan eğilimi
-- ─────────────────────────────────────────────────────────────────────────
-- lib/upplan/config.ts UPPLAN_TRACK_SQL_CONFIG ile senkron (config.test.ts).
insert into public.upplan_config (key, value, note) values
  ('maarif_lower_grade_proximity', 0.5, 'Alt sınıftan eksik konunun okul yakınlığı yerine geçen çarpan (x ustalık açığı)'),
  ('yks_value_reason_min', 0.5, '11: YKS değeri (0..1) bu ve üstündeyse gerekçede belirtilir'),
  ('alan_egilimi_bonus', 1.1, '10. sınıf alan eğilimi dersine öncelik çarpanı')
on conflict (key) do nothing;
