-- seed_maarif_11_felsefe.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:
-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.
--
-- Ders     : 11. Sınıf Felsefe  (müfredat tymm-2026, Anadolu lisesi)
-- Kaynak   : https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip
-- Konu     : 6
-- NOT      : 11. sınıf felsefe ünitelerinin AYT Felsefe Grubu konularıyla eşleşmesi zayıf (yeni program tematik).
--
-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < 0.5 = emin değilim)
--     1 | Çevre Sorunları ve Felsefe | Çevre ve İnsan İlişkisi, Çevre Etiği | AYT Felsefe › Ahlak Felsefesi (Etik) (0.4 ?); TYT Felsefe › Ahlak Felsefesi (0.3 ?)
--     7 | Teknoloji ve Hayat | Teknoloji Bağlamında Ontolojik ve Aksiyolojik Problemler | AYT Felsefe › Varlık Felsefesi (Ontoloji) (0.3 ?)
--    13 | Akıl ve İnanç | Akıl-İnanç İlişkisi | AYT Felsefe › Din Felsefesi (0.6); TYT Felsefe › Din Felsefesi (0.5)
--    19 | Edebiyat ve Felsefe | Edebiyat-Felsefe İlişkisi | AYT Felsefe › Sanat Felsefesi (Estetik) (0.3 ?)
--    25 | Hayatın Anlamı | Hayatın Anlamına Yönelik Felsefi Sorular | AYT Felsefe › Felsefeye Giriş ve Tarihsel Gelişim (0.3 ?)
--    31 | Hukuk ve Felsefe | Hukuk Felsefesi | AYT Felsefe › Siyaset Felsefesi (0.4 ?); AYT Felsefe › Ahlak Felsefesi (Etik) (0.3 ?)

select public.maarif_apply_curriculum('{"version":"tymm-2026","subjects":[{"name":"11. Sınıf Felsefe","ders_key":"felsefe","grade":11,"color":"#DB2777","order":1109,"source":"https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip","topics":[{"name":"Çevre ve İnsan İlişkisi, Çevre Etiği","order":1,"week":1,"unit":"Çevre Sorunları ve Felsefe","yks":[{"subject":"AYT Felsefe","topic":"Ahlak Felsefesi (Etik)","strength":0.4},{"subject":"TYT Felsefe","topic":"Ahlak Felsefesi","strength":0.3}]},{"name":"Teknoloji Bağlamında Ontolojik ve Aksiyolojik Problemler","order":2,"week":7,"unit":"Teknoloji ve Hayat","yks":[{"subject":"AYT Felsefe","topic":"Varlık Felsefesi (Ontoloji)","strength":0.3}]},{"name":"Akıl-İnanç İlişkisi","order":3,"week":13,"unit":"Akıl ve İnanç","yks":[{"subject":"AYT Felsefe","topic":"Din Felsefesi","strength":0.6},{"subject":"TYT Felsefe","topic":"Din Felsefesi","strength":0.5}]},{"name":"Edebiyat-Felsefe İlişkisi","order":4,"week":19,"unit":"Edebiyat ve Felsefe","yks":[{"subject":"AYT Felsefe","topic":"Sanat Felsefesi (Estetik)","strength":0.3}]},{"name":"Hayatın Anlamına Yönelik Felsefi Sorular","order":5,"week":25,"unit":"Hayatın Anlamı","yks":[{"subject":"AYT Felsefe","topic":"Felsefeye Giriş ve Tarihsel Gelişim","strength":0.3}]},{"name":"Hukuk Felsefesi","order":6,"week":31,"unit":"Hukuk ve Felsefe","yks":[{"subject":"AYT Felsefe","topic":"Siyaset Felsefesi","strength":0.4},{"subject":"AYT Felsefe","topic":"Ahlak Felsefesi (Etik)","strength":0.3}]}],"retire":[]}]}'::jsonb);
