-- seed_maarif_10_ingilizce.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:
-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.
--
-- Ders     : 10. Sınıf İngilizce  (müfredat tymm-2026, Anadolu lisesi)
-- Kaynak   : https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-taslak-yillik-planlar_20260827_111530_896.rar
-- Konu     : 10
--
-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < 0.5 = emin değilim)
--     2 | Revision | Revision: Countries, Nationalities and Languages | —
--     4 | Revision | Revision: Houses and Neighbourhood | —
--     6 | Theme 1 | School Life & Education | —
--     9 | Theme 2 | Classroom Life & Learning | —
--    13 | Theme 3 | Personal Life and Well-Being | —
--    17 | Theme 4 | Family Life & Home | —
--    21 | Theme 5 | Life in the Neighbourhood, City & Social Life | —
--    25 | Theme 6 | Life in the World & Culture | —
--    28 | Theme 7 | Life in Nature & Global Problems | —
--    32 | Theme 8 | Life in the Universe & the Future | —

select public.maarif_apply_curriculum('{"version":"tymm-2026","subjects":[{"name":"10. Sınıf İngilizce","ders_key":"ingilizce","grade":10,"color":"#0EA5E9","order":1010,"source":"https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-taslak-yillik-planlar_20260827_111530_896.rar","topics":[{"name":"Revision: Countries, Nationalities and Languages","order":1,"week":2,"unit":"Revision","yks":[]},{"name":"Revision: Houses and Neighbourhood","order":2,"week":4,"unit":"Revision","yks":[]},{"name":"School Life & Education","order":3,"week":6,"unit":"Theme 1","yks":[]},{"name":"Classroom Life & Learning","order":4,"week":9,"unit":"Theme 2","yks":[]},{"name":"Personal Life and Well-Being","order":5,"week":13,"unit":"Theme 3","yks":[]},{"name":"Family Life & Home","order":6,"week":17,"unit":"Theme 4","yks":[]},{"name":"Life in the Neighbourhood, City & Social Life","order":7,"week":21,"unit":"Theme 5","yks":[]},{"name":"Life in the World & Culture","order":8,"week":25,"unit":"Theme 6","yks":[]},{"name":"Life in Nature & Global Problems","order":9,"week":28,"unit":"Theme 7","yks":[]},{"name":"Life in the Universe & the Future","order":10,"week":32,"unit":"Theme 8","yks":[]}],"retire":[]}]}'::jsonb);
