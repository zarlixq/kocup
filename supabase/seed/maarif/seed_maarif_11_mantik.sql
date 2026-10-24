-- seed_maarif_11_mantik.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:
-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.
--
-- Ders     : 11. Sınıf Mantık  (müfredat tymm-2026, Anadolu lisesi)
-- Kaynak   : https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip
-- Konu     : 7
-- NOT      : Plan dosyasında sınıf belirtilmemiş ('MANTIK' sayfası); 11. sınıf seçmeli kabul edildi.
--
-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < 0.5 = emin değilim)
--     1 | Mantığın Doğası | Mantığın Doğası ve Tarihsel Gelişimi | AYT Felsefe › Mantığa Giriş ve Klasik Mantık (0.8)
--     6 | Aristotelesçi Mantık | Kavram ve Terim | AYT Felsefe › Mantığa Giriş ve Klasik Mantık (0.9)
--     8 | Aristotelesçi Mantık | Önerme | AYT Felsefe › Mantığa Giriş ve Klasik Mantık (0.9)
--    11 | Aristotelesçi Mantık | Çıkarım (Kıyas) | AYT Felsefe › Mantığa Giriş ve Klasik Mantık (0.9)
--    14 | Sembolik Mantık | Eklemler Mantığı | AYT Felsefe › Sembolik Mantık (0.9); TYT Matematik › Mantık (0.4 ?)
--    19 | Sembolik Mantık | Niceleme / Yüklemler Mantığı | AYT Felsefe › Sembolik Mantık (0.8)
--    23 | Mantık Çeşitleri ve Uygulamaları | Mantık Çeşitleri ve Uygulamaları | AYT Felsefe › Mantık ve Dil (0.4 ?)

select public.maarif_apply_curriculum('{"version":"tymm-2026","subjects":[{"name":"11. Sınıf Mantık","ders_key":"mantik","grade":11,"color":"#64748B","order":1112,"source":"https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip","topics":[{"name":"Mantığın Doğası ve Tarihsel Gelişimi","order":1,"week":1,"unit":"Mantığın Doğası","yks":[{"subject":"AYT Felsefe","topic":"Mantığa Giriş ve Klasik Mantık","strength":0.8}]},{"name":"Kavram ve Terim","order":2,"week":6,"unit":"Aristotelesçi Mantık","yks":[{"subject":"AYT Felsefe","topic":"Mantığa Giriş ve Klasik Mantık","strength":0.9}]},{"name":"Önerme","order":3,"week":8,"unit":"Aristotelesçi Mantık","yks":[{"subject":"AYT Felsefe","topic":"Mantığa Giriş ve Klasik Mantık","strength":0.9}]},{"name":"Çıkarım (Kıyas)","order":4,"week":11,"unit":"Aristotelesçi Mantık","yks":[{"subject":"AYT Felsefe","topic":"Mantığa Giriş ve Klasik Mantık","strength":0.9}]},{"name":"Eklemler Mantığı","order":5,"week":14,"unit":"Sembolik Mantık","yks":[{"subject":"AYT Felsefe","topic":"Sembolik Mantık","strength":0.9},{"subject":"TYT Matematik","topic":"Mantık","strength":0.4}]},{"name":"Niceleme / Yüklemler Mantığı","order":6,"week":19,"unit":"Sembolik Mantık","yks":[{"subject":"AYT Felsefe","topic":"Sembolik Mantık","strength":0.8}]},{"name":"Mantık Çeşitleri ve Uygulamaları","order":7,"week":23,"unit":"Mantık Çeşitleri ve Uygulamaları","yks":[{"subject":"AYT Felsefe","topic":"Mantık ve Dil","strength":0.4}]}],"retire":[]}]}'::jsonb);
