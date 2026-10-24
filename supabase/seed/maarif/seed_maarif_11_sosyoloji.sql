-- seed_maarif_11_sosyoloji.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:
-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.
--
-- Ders     : 11. Sınıf Sosyoloji  (müfredat tymm-2026, Anadolu lisesi)
-- Kaynak   : https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip
-- Konu     : 9
--
-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < 0.5 = emin değilim)
--     1 | Sosyolojinin Doğuşu | Sosyolojinin Doğuşu ve Sosyolojik Düşünme | AYT Sosyoloji › Sosyolojiye Giriş (0.9)
--     5 | Sosyolojinin Doğuşu | Sosyolojide Kullanılan Yöntemler | AYT Sosyoloji › Sosyolojiye Giriş (0.7)
--     9 | Türkiye'de Modernleşme ve Sosyoloji | Osmanlı'dan Cumhuriyet'e Modernleşme | AYT Sosyoloji › Toplumsal Değişme ve Gelişme (0.7)
--    12 | Türkiye'de Modernleşme ve Sosyoloji | Türkiye'de Sosyolojinin Gelişimi ve Edebiyatla İlişkisi | AYT Sosyoloji › Sosyolojiye Giriş (0.4 ?)
--    16 | Kültür ve Toplumsal Yapı | Kültür | AYT Sosyoloji › Toplum ve Kültür (0.9)
--    19 | Kültür ve Toplumsal Yapı | Toplumsal Yapı, Tabakalaşma ve Hareketlilik | AYT Sosyoloji › Toplumsal Yapı (0.9)
--    23 | Toplumsal Kurumlar | Aile ve Eğitim Kurumları | AYT Sosyoloji › Toplumsal Kurumlar (0.9)
--    26 | Toplumsal Kurumlar | Din, Ekonomi ve Siyaset Kurumları | AYT Sosyoloji › Toplumsal Kurumlar (0.9)
--    31 | Güncel Sosyolojik Meseleler | Güncel Sosyolojik Meseleler | AYT Sosyoloji › Toplumsal Değişme ve Gelişme (0.5)

select public.maarif_apply_curriculum('{"version":"tymm-2026","subjects":[{"name":"11. Sınıf Sosyoloji","ders_key":"sosyoloji","grade":11,"color":"#9333EA","order":1111,"source":"https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip","topics":[{"name":"Sosyolojinin Doğuşu ve Sosyolojik Düşünme","order":1,"week":1,"unit":"Sosyolojinin Doğuşu","yks":[{"subject":"AYT Sosyoloji","topic":"Sosyolojiye Giriş","strength":0.9}]},{"name":"Sosyolojide Kullanılan Yöntemler","order":2,"week":5,"unit":"Sosyolojinin Doğuşu","yks":[{"subject":"AYT Sosyoloji","topic":"Sosyolojiye Giriş","strength":0.7}]},{"name":"Osmanlı''dan Cumhuriyet''e Modernleşme","order":3,"week":9,"unit":"Türkiye''de Modernleşme ve Sosyoloji","yks":[{"subject":"AYT Sosyoloji","topic":"Toplumsal Değişme ve Gelişme","strength":0.7}]},{"name":"Türkiye''de Sosyolojinin Gelişimi ve Edebiyatla İlişkisi","order":4,"week":12,"unit":"Türkiye''de Modernleşme ve Sosyoloji","yks":[{"subject":"AYT Sosyoloji","topic":"Sosyolojiye Giriş","strength":0.4}]},{"name":"Kültür","order":5,"week":16,"unit":"Kültür ve Toplumsal Yapı","yks":[{"subject":"AYT Sosyoloji","topic":"Toplum ve Kültür","strength":0.9}]},{"name":"Toplumsal Yapı, Tabakalaşma ve Hareketlilik","order":6,"week":19,"unit":"Kültür ve Toplumsal Yapı","yks":[{"subject":"AYT Sosyoloji","topic":"Toplumsal Yapı","strength":0.9}]},{"name":"Aile ve Eğitim Kurumları","order":7,"week":23,"unit":"Toplumsal Kurumlar","yks":[{"subject":"AYT Sosyoloji","topic":"Toplumsal Kurumlar","strength":0.9}]},{"name":"Din, Ekonomi ve Siyaset Kurumları","order":8,"week":26,"unit":"Toplumsal Kurumlar","yks":[{"subject":"AYT Sosyoloji","topic":"Toplumsal Kurumlar","strength":0.9}]},{"name":"Güncel Sosyolojik Meseleler","order":9,"week":31,"unit":"Güncel Sosyolojik Meseleler","yks":[{"subject":"AYT Sosyoloji","topic":"Toplumsal Değişme ve Gelişme","strength":0.5}]}],"retire":[]}]}'::jsonb);
