-- ─────────────────────────────────────────────────────────────────────────
-- 214 — topics.grade: 212'de boş kalan 3 aktif konu
-- ─────────────────────────────────────────────────────────────────────────
-- Karmaşık Sayılar: MEB 2018 programında 10. sınıf (İkinci Dereceden
-- Denklemler ünitesi, 10.4.2).
-- Sözel Mantık / Rutin Olmayan Problemler: müfredat ünitesi yok, TYT akıl
-- yürütme konusu → 9 (her öğrencinin çalışması gerekir; "11./12. sınıf
-- konularını görmedim" toplu işaretine girmemeli).
-- ─────────────────────────────────────────────────────────────────────────

update public.topics t
   set grade = v.grade
  from (values
  ('aed895a6-ba55-452f-98ee-64255ba74a86'::uuid, 10),
  ('12a451d9-592b-55d4-9c9b-8763a4809d99'::uuid, 9),
  ('ecd5a174-c265-53e9-bf0f-dd5da3458b41'::uuid, 9)
  ) as v(id, grade)
 where t.id = v.id
   and t.grade is null;
