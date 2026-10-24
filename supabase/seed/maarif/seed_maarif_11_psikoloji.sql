-- seed_maarif_11_psikoloji.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:
-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.
--
-- Ders     : 11. Sınıf Psikoloji  (müfredat tymm-2026, Anadolu lisesi)
-- Kaynak   : https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip
-- Konu     : 7
-- NOT      : Plan dosyasında sınıf belirtilmemiş ('Psikoloji' sayfası); 11. sınıf seçmeli kabul edildi.
--
-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < 0.5 = emin değilim)
--     1 | Psikoloji ile Tanışma | Psikolojinin Tanımı, Alt Dalları ve Yöntemleri | AYT Felsefe › Psikolojiye Giriş (0.9)
--     6 | Gelişimi Anlamak | Gelişim Dönemleri ve Görevleri | AYT Felsefe › Psikolojiye Giriş (0.5)
--    11 | Gelişimi Anlamak | Zekâ, Kişilik ve Benlik | AYT Felsefe › Psikolojinin Temel Süreçleri (Algı, Dikkat) (0.4 ?)
--    15 | Nasıl Öğreniriz? | Öğrenme ve Öğrenme Türleri | AYT Felsefe › Öğrenme ve Bellek (0.9)
--    22 | Nasıl Öğreniriz? | İnsan Öğrenmesi ve Makine Öğrenmesi | AYT Felsefe › Öğrenme ve Bellek (0.4 ?)
--    26 | Bireysel ve Sosyal Uyum | Uyum Sorunları ve Uyum Sağlama | AYT Felsefe › Psikoloji ve Ruh Sağlığı (0.8)
--    31 | Bireysel ve Sosyal Uyum | Tutum ve Sosyal Davranışlar | AYT Felsefe › Sosyal Psikoloji (0.8)

select public.maarif_apply_curriculum('{"version":"tymm-2026","subjects":[{"name":"11. Sınıf Psikoloji","ders_key":"psikoloji","grade":11,"color":"#E11D48","order":1113,"source":"https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip","topics":[{"name":"Psikolojinin Tanımı, Alt Dalları ve Yöntemleri","order":1,"week":1,"unit":"Psikoloji ile Tanışma","yks":[{"subject":"AYT Felsefe","topic":"Psikolojiye Giriş","strength":0.9}]},{"name":"Gelişim Dönemleri ve Görevleri","order":2,"week":6,"unit":"Gelişimi Anlamak","yks":[{"subject":"AYT Felsefe","topic":"Psikolojiye Giriş","strength":0.5}]},{"name":"Zekâ, Kişilik ve Benlik","order":3,"week":11,"unit":"Gelişimi Anlamak","yks":[{"subject":"AYT Felsefe","topic":"Psikolojinin Temel Süreçleri (Algı, Dikkat)","strength":0.4}]},{"name":"Öğrenme ve Öğrenme Türleri","order":4,"week":15,"unit":"Nasıl Öğreniriz?","yks":[{"subject":"AYT Felsefe","topic":"Öğrenme ve Bellek","strength":0.9}]},{"name":"İnsan Öğrenmesi ve Makine Öğrenmesi","order":5,"week":22,"unit":"Nasıl Öğreniriz?","yks":[{"subject":"AYT Felsefe","topic":"Öğrenme ve Bellek","strength":0.4}]},{"name":"Uyum Sorunları ve Uyum Sağlama","order":6,"week":26,"unit":"Bireysel ve Sosyal Uyum","yks":[{"subject":"AYT Felsefe","topic":"Psikoloji ve Ruh Sağlığı","strength":0.8}]},{"name":"Tutum ve Sosyal Davranışlar","order":7,"week":31,"unit":"Bireysel ve Sosyal Uyum","yks":[{"subject":"AYT Felsefe","topic":"Sosyal Psikoloji","strength":0.8}]}],"retire":[]}]}'::jsonb);
