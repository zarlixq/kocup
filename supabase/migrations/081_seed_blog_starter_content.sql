-- ─────────────────────────────────────────────────────────────────────────
-- BLOG SEED: 4 kategori + 3 published post (gerçek içerik)
-- Tarihler bugünden geriye dönük: 1, 2 ve 3 hafta önce
-- author_id: ilk admin profile
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Eğitim', 'egitim', 'Eğitim ve öğrenme süreçleri üzerine yazılar'),
  ('Sınav Hazırlık', 'sinav-hazirlik', 'YKS, LGS ve sınav hazırlık stratejileri'),
  ('Veli Rehberi', 'veli-rehberi', 'Veliler için pratik rehber içerikler'),
  ('Koçluk', 'kocluk', 'Eğitim koçluğu ve süreç yönetimi');

-- POST 1: YKS Yol Haritası (1 hafta önce)
INSERT INTO public.blog_posts (
  slug, title, excerpt, content, cover_image_url,
  category_id, author_id, status, published_at,
  meta_title, meta_description, meta_keywords
) VALUES (
  'yks-yol-haritasi-2026',
  'YKS''ye Nasıl Hazırlanılır? 2026 Yol Haritası',
  'TYT ve AYT ayrımı, hazırlık süresi senaryoları, deneme sıklığı, konu önceliklendirme ve net hesaplama mantığı. Her sınıf için pratik bir yol haritası.',
  E'Üniversite sınavına hazırlık, çoğu öğrenci için hayatlarındaki en uzun ve en yorucu süreçlerden biri. Doğru bir plan olmadan başlayan öğrenciler aylar sonra "zaman nasıl geçti?" sorusuyla yüzleşiyor. Bu yazıda YKS''ye sistematik bir hazırlığın iskeletini çıkardık: TYT ile AYT arasındaki farktan başlayıp puan hesaplaması, hazırlık süresi senaryoları, deneme sıklığı ve konu önceliklendirme stratejisine kadar.\n\n## TYT ve AYT Nedir?\n\nYKS iki ana oturumdan oluşur. **Temel Yeterlilik Testi (TYT)** ilk oturumdur ve tüm adayların girmek zorunda olduğu temel sınavdır. İçeriği Türkçe, sosyal bilimler, temel matematik ve fen bilimleri sorularından oluşur. TYT puanı tek başına önlisans ve bazı lisans programları için yeterli olabilir.\n\n**Alan Yeterlilik Testi (AYT)** ise ikinci oturumdur. AYT''de aday seçtiği alana göre matematik, fizik, kimya, biyoloji, edebiyat-sosyal veya yabancı dil bölümlerine girer. Lisans programlarının büyük çoğunluğu için AYT puanı zorunludur.\n\n### Puan Hesaplaması\n\nYerleştirme puanı sınav netleri üzerinden hesaplanır. **Net = Doğru − (Yanlış / 4)**. Bu basit formül, gelişigüzel "tahmin etmek" alışkanlığını cezalandırır; çünkü her 4 yanlış 1 doğruyu götürür.\n\n## Hazırlık Süresi: Kaç Ay Önceden Başlamalısın?\n\nYKS hazırlığı için tek bir doğru süre yok. Üç temel senaryo üzerinden gidelim.\n\n### 24 Ay Senaryosu (10. Sınıf Sonu)\n\nBu senaryo, hedefini erken belirlemiş öğrenciler içindir. İlk yıl konu öğrenmeye, ikinci yıl tekrar ve denemeye ayrılır. Günlük 2-3 saatlik düzenli çalışma yeterlidir.\n\n### 12 Ay Senaryosu (11. Sınıf Yazı)\n\nEn yaygın senaryo. 12. sınıfa girmeden yaz aylarında başlanır. Günlük çalışma süresi 4-5 saate çıkar, hafta sonları 6-7 saat hedeflenir.\n\n### 9 Ay Senaryosu (12. Sınıf Eylül)\n\nGeç kalınmış ama hâlâ yapılabilir. Günlük 6 saat üzerine çıkmak, sosyal medyayı kısıtlamak ve haftalık değerlendirme zorunlu hale gelir.\n\n## Deneme Sınavlarının Yeri\n\nDeneme sınavı, sınava giriş "provası"dır. Yalnızca bilgi ölçmez; süre yönetimi, soru seçimi, stres altında karar verme gibi becerileri ölçer.\n\n- **İlk 6 ay**: 2 haftada bir TYT denemesi\n- **Son 6 ay**: Haftada 1 TYT + 2 haftada 1 AYT\n- **Son 2 ay**: Haftada 2 deneme\n\nDenemenin değeri çözmek değil **analizidir**.\n\n## Konu Önceliklendirme Stratejisi\n\nTüm konuları aynı derinlikte çalışmak verimsizdir:\n\n1. **Yüksek öncelik**: Türkçe paragraf, matematik temel kavramlar, AYT alan derslerinin ana üniteleri. %60 zaman.\n2. **Orta**: Geometri, fizik mekanik, edebiyat dönem analizleri. %30 zaman.\n3. **Düşük**: Coğrafyada nadir gelen konular, kimyada periyodik tablo detayları. %10 zaman.\n\n## Net Hesaplama Mantığı\n\nDoğru hedef belirlemek için "kaç net" bilgisi şarttır. Net hesabını **toplam üzerinden değil ders bazında** yap.\n\n## Sonuç\n\nYKS''ye hazırlık doğru planlanırsa bir maraton; planlanmazsa bir kaos. Hangi senaryoda olursan ol, üç şey değişmez: düzenli deneme, konu önceliklendirme ve haftalık değerlendirme. Bir koçla çalışmak bu üçünü tek başına götürmenin yükünü ciddi şekilde azaltır.',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
  (SELECT id FROM public.blog_categories WHERE slug = 'sinav-hazirlik'),
  (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC NULLS LAST LIMIT 1),
  'published',
  '2026-05-18 10:00:00+00',
  'YKS''ye Nasıl Hazırlanılır? 2026 Yol Haritası',
  'TYT/AYT ayrımı, hazırlık süresi, deneme planı ve konu önceliklendirme — YKS''ye sistematik bir hazırlık rehberi.',
  ARRAY['YKS', 'TYT', 'AYT', 'sınav hazırlık', 'üniversite sınavı', 'eğitim koçluğu']
);

-- POST 2: Eğitim Koçluğu Nedir? (2 hafta önce)
INSERT INTO public.blog_posts (
  slug, title, excerpt, content, cover_image_url,
  category_id, author_id, status, published_at,
  meta_title, meta_description, meta_keywords
) VALUES (
  'egitim-koclugu-nedir-cocugunuz-icin-dogru-mu',
  'Eğitim Koçluğu Nedir? Çocuğunuz İçin Doğru Mu?',
  'Eğitim koçluğu ile özel ders arasındaki fark, hangi öğrenci profillerine uygun olduğu, velinin rolü ve MYK sertifikasının önemi.',
  E'Son yıllarda "eğitim koçluğu" terimi velilerin gündemine sıkça giriyor. Eğitim koçluğu, öğrencinin **kendi öğrenme sürecini yönetmesini öğreten** bir süreçtir.\n\n## Eğitim Koçluğu vs Özel Ders\n\nÖzel ders bir konuyu öğretir. Eğitim koçluğu **nasıl öğrenileceğini** öğretir.\n\nÖzel derste odak ders içeriğindedir: "Türev nasıl alınır?" Koçlukta odak öğrencinin sürecidir: "Türev konusuna kaç saat ayırdın, eksik kaldığın yer hangisi?"\n\n## Hangi Öğrenci Profillerine Uygun?\n\n### Plansız Öğrenci\nNotları iyi gidiyor ama nasıl çalıştığını kendisi de bilmiyor. Koçluk burada **yapı kurar**.\n\n### Motivasyon Eksiği\n"Yapamayacağım" hissi sürekli devrededir. Bu duygu genelde başarısızlık değil, **belirsizlikten** doğar.\n\n### Hedefli Ama Yön Bulamayan\n"Tıp istiyorum" diyen ama günlük rutininde tıp gerektiren disiplini sergileyemeyen öğrenci.\n\n## Velinin Rolü\n\nPek çok veli "ben bu süreci yönetebilirim" düşüncesiyle başlar. Ebeveyn-çocuk ilişkisi duygusal yüke sahiptir; bu yük öğrencinin "raporlama" yapma isteğini azaltır.\n\nVelinin doğru rolü:\n\n- **Bilgi sahibi** olmak\n- **Destekleyici** olmak\n- **Müdahale etmemek**\n\n## Koçun Rolü ve Sorumlulukları\n\nİyi bir eğitim koçu üç şey yapar:\n\n1. **Plan kurar**\n2. **Takip eder**\n3. **Revize eder**\n\n## MYK Sertifikasının Önemi\n\nTürkiye''de "eğitim koçluğu" alanı düzenli denetlenen bir alan değil. **MYK (Mesleki Yeterlilik Kurumu) Onaylı Eğitim Koçluğu Sertifikası** bu mesleğin resmi belgesidir. Veli olarak ilk soracağın soru şu olmalı: "Koçunuz MYK sertifikalı mı?"\n\n## Sonuç\n\nÇocuğunuza uygun olup olmadığını anlamanın en hızlı yolu **bir tanışma seansı** almaktır.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
  (SELECT id FROM public.blog_categories WHERE slug = 'kocluk'),
  (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC NULLS LAST LIMIT 1),
  'published',
  '2026-05-11 14:00:00+00',
  'Eğitim Koçluğu Nedir? Çocuğunuz İçin Doğru Mu?',
  'Eğitim koçluğu ile özel ders farkı, kimlere uygun olduğu, velinin rolü ve MYK sertifikasının önemi.',
  ARRAY['eğitim koçluğu', 'YKS koçluğu', 'veli rehberi', 'MYK sertifikası', 'öğrenci koçluğu']
);

-- POST 3: Çalışma Teknikleri (3 hafta önce)
INSERT INTO public.blog_posts (
  slug, title, excerpt, content, cover_image_url,
  category_id, author_id, status, published_at,
  meta_title, meta_description, meta_keywords
) VALUES (
  'verimli-calisma-teknikleri-pomodoro-ve-otesi',
  'Verimli Çalışma Teknikleri: Pomodoro ve Ötesi',
  'Pomodoro, Feynman, Active Recall ve Spaced Repetition — bilimsel olarak desteklenmiş dört temel öğrenme tekniği.',
  E'"Saatlerce ders çalıştım ama hiçbir şey aklımda kalmadı." Sorun çoğunlukla çalışma süresinde değil, çalışma **yönteminde**.\n\n## Pomodoro Tekniği\n\nFrancesco Cirillo tarafından 1980''lerde geliştirilen Pomodoro tekniği basit bir zaman yönetimi yöntemidir.\n\n### Nasıl Uygulanır?\n\n1. Bir göreve odaklan ve 25 dakikalık zamanlayıcı kur\n2. Sadece o göreve odaklan\n3. Süre dolunca 5 dakika ara ver\n4. Her 4 pomodoroda bir 15-30 dakika uzun ara\n\n## Feynman Tekniği\n\nRichard Feynman''ın adıyla anılan bu teknik dört adımdan oluşur:\n\n1. Konuyu seç ve bildiklerini yaz\n2. **Bir çocuğa anlatır gibi** kendi cümlelerinle açıkla\n3. Tıkandığın yerleri belirle\n4. Kitaba dön, eksikleri gider, baştan başla\n\n## Active Recall (Aktif Hatırlama)\n\n- **Pasif okuma**: Kitabı tekrar tekrar okumak\n- **Aktif hatırlama**: Kitabı kapatıp yazdıklarını hatırlamaya çalışmak\n\nBir dakikalık aktif hatırlama, on dakikalık pasif tekrardan daha fazla şey öğretir.\n\n## Spaced Repetition (Aralıklı Tekrar)\n\nKlasik aralıklı tekrar takvimi:\n\n- 1. tekrar: 1 gün sonra\n- 2. tekrar: 3 gün sonra\n- 3. tekrar: 1 hafta sonra\n- 4. tekrar: 2 hafta sonra\n- 5. tekrar: 1 ay sonra\n\n## Hangi Tekniği Ne Zaman?\n\n- **Yeni konu öğrenirken**: Pomodoro + Active Recall\n- **Sınav öncesi tekrar**: Feynman + Spaced Repetition\n- **Erteleme problemi varsa**: Pomodoro\n- **Ezberlenmesi gereken konu**: Spaced Repetition\n\n## Sonuç\n\nVerimlilik bir "yetenek" değil, **alışkanlık zinciridir**. Birini seç, alışkanlık haline gelince ikincisini ekle.',
  'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=1200&q=80',
  (SELECT id FROM public.blog_categories WHERE slug = 'egitim'),
  (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC NULLS LAST LIMIT 1),
  'published',
  '2026-05-04 09:00:00+00',
  'Verimli Çalışma Teknikleri: Pomodoro ve Ötesi',
  'Pomodoro, Feynman, Active Recall ve Spaced Repetition. Bilimsel olarak desteklenmiş 4 çalışma tekniği.',
  ARRAY['pomodoro', 'çalışma teknikleri', 'verimli çalışma', 'active recall', 'spaced repetition', 'feynman tekniği']
);
