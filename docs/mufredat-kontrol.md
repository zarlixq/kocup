# Maarif müfredat kontrolü (TYMM 2026, Anadolu lisesi)

> ÜRETİLDİ: `node scripts/maarif/build-seed.mjs`. Veri: `supabase/seed/maarif/curriculum-2026.mjs`.
> Ders başına SQL: `supabase/seed/maarif/seed_maarif_<sinif>_<ders>.sql` (başında okunabilir konu tablosu).

## Kaynaklar

- 2026-2027 taslak çerçeve yıllık planları (hafta hafta ünite/konu): https://tymm.meb.gov.tr/taslak-cerceve-planlari/ortaogretim
- Din Kültürü ve Ahlak Bilgisi planları: https://dogm.meb.gov.tr/www/cerceve-yillik-planlar/icerik/2257
- Öğretim programları: https://tymm.meb.gov.tr/ogretim-programlari · https://mufredat.meb.gov.tr
- Fen lisesi ve sosyal bilimler lisesi planları alınmadı (Anadolu lisesi esas).
- Okul haftası (`topics.school_week`) planlardaki "N. Hafta" numarasıdır; tatil haftaları sayılmaz
  (`school_calendar_weeks`: 1. hafta 14 Eylül 2026, 19. hafta 8 Şubat 2027).

## Ders/sınıf başına konu sayısı (toplam 458)

| Sınıf | Ders | Konu | Pasife alınan eski | Emin olunmayan YKS eşlemesi | YKS eşlemesi yok | Kaynak |
|---|---|---|---|---|---|---|
| 9 | Matematik | 19 | 10 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/matematik-dersi-taslak-yillik-planlar_20260827_083834_941.zip) |
| 9 | Fizik | 20 | 0 | 4 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/fizik-dersi-taslak-yillik-planlar_20260827_083757_124.zip) |
| 9 | Kimya | 21 | 0 | 6 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/kimya-dersi-taslak-yillik-planlar_20260827_083820_533.zip) |
| 9 | Biyoloji | 20 | 2 | 4 | 1 | [plan](https://tymm.meb.gov.tr/assets/file/biyoloji-dersi-taslak-yillik-planlar_20260831_190639_106.zip) |
| 9 | Edebiyat | 18 | 48 | 6 | 2 | [plan](https://tymm.meb.gov.tr/assets/file/turk-dili-ve-edebiyati-dersi-taslak-yillik-planlar_20260827_142401_066.zip) |
| 9 | Tarih | 13 | 0 | 3 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/tarih-dersi-taslak-yillik-planlar_20260827_083900_546.zip) |
| 9 | Coğrafya | 19 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/cografya-dersi-taslak-yillik-planlar_20260827_083607_902.zip) |
| 9 | Din Kültürü | 16 | 0 | 2 | 0 | [plan](https://dogm.meb.gov.tr/Programlar/CerceveYillikPlan/DKAB/2026-2027dkab9_TYMM.xlsx) |
| 9 | İngilizce | 10 | 0 | 0 | 10 | [plan](https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-taslak-yillik-planlar_20260827_111530_896.rar) |
| 10 | Matematik | 21 | 1 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/matematik-dersi-taslak-yillik-planlar_20260827_083834_941.zip) |
| 10 | Fizik | 17 | 2 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/fizik-dersi-taslak-yillik-planlar_20260827_083757_124.zip) |
| 10 | Kimya | 16 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/kimya-dersi-taslak-yillik-planlar_20260827_083820_533.zip) |
| 10 | Biyoloji | 18 | 0 | 0 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/biyoloji-dersi-taslak-yillik-planlar_20260831_190639_106.zip) |
| 10 | Edebiyat | 15 | 0 | 4 | 1 | [plan](https://tymm.meb.gov.tr/assets/file/turk-dili-ve-edebiyati-dersi-taslak-yillik-planlar_20260827_142401_066.zip) |
| 10 | Tarih | 14 | 0 | 0 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/tarih-dersi-taslak-yillik-planlar_20260827_083900_546.zip) |
| 10 | Coğrafya | 14 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/cografya-dersi-taslak-yillik-planlar_20260827_083607_902.zip) |
| 10 | Felsefe | 9 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip) |
| 10 | Din Kültürü | 12 | 0 | 4 | 0 | [plan](https://dogm.meb.gov.tr/Programlar/CerceveYillikPlan/DKAB/2026-2027dkab10_TYMM.xlsx) |
| 10 | İngilizce | 10 | 0 | 0 | 10 | [plan](https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-taslak-yillik-planlar_20260827_111530_896.rar) |
| 11 | Matematik | 15 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/matematik-dersi-taslak-yillik-planlar_20260827_083834_941.zip) |
| 11 | Fizik | 16 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/fizik-dersi-taslak-yillik-planlar_20260827_083757_124.zip) |
| 11 | Kimya | 18 | 0 | 3 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/kimya-dersi-taslak-yillik-planlar_20260827_083820_533.zip) |
| 11 | Biyoloji | 16 | 0 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/biyoloji-dersi-taslak-yillik-planlar_20260831_190639_106.zip) |
| 11 | Edebiyat | 14 | 0 | 5 | 3 | [plan](https://tymm.meb.gov.tr/assets/file/turk-dili-ve-edebiyati-dersi-taslak-yillik-planlar_20260827_142401_066.zip) |
| 11 | Tarih | 11 | 0 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/tarih-dersi-taslak-yillik-planlar_20260827_083900_546.zip) |
| 11 | Coğrafya | 16 | 0 | 3 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/cografya-dersi-taslak-yillik-planlar_20260827_083607_902.zip) |
| 11 | Felsefe | 6 | 0 | 7 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip) |
| 11 | Sosyoloji | 9 | 0 | 1 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip) |
| 11 | Mantık | 7 | 0 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip) |
| 11 | Psikoloji | 7 | 0 | 2 | 0 | [plan](https://tymm.meb.gov.tr/assets/file/felsefe-dersi-taslak-yillik-planlar_20260827_123428_620.zip) |
| 11 | Din Kültürü | 11 | 0 | 4 | 0 | [plan](https://dogm.meb.gov.tr/Programlar/CerceveYillikPlan/DKAB/2026-2027dkab11_TYMM.xlsx) |
| 11 | İngilizce | 10 | 0 | 0 | 10 | [plan](https://tymm.meb.gov.tr/assets/file/ingilizce-dersi-taslak-yillik-planlar_20260827_111530_896.rar) |

## Öğretmene sorulacaklar

- **9. Sınıf Matematik:** 
  - **Gerçek Sayıların İşlem Özelliklerini Cebirsel Olarak İfade Etme:** Eski programdaki 'İki Kare Farkı ve Tamkare Özdeşlikleri' bu konunun içinde mi işleniyor?
- **9. Sınıf Fizik:** 
  - **Enerji, Isı ve Sıcaklık Arasındaki İlişki:** 2026 planında başlık 'İç Enerji, Isı ve Sıcaklık Arasındaki İlişki'; eski satır korundu.
- **9. Sınıf Biyoloji:** 'Hücreden Doku' ve 'Organ ve Sistemlerin Organizasyonu' 2026 planında yok; pasife alındı. Okulda işleniyorsa geri açılmalı.
  - **Yağlar:** 2026 planında 'Lipitler' olarak geçiyor.
  - **Proteinler:** Enzimler bu konunun içinde (planda Proteinler > Enzimler).
- **9. Sınıf Edebiyat:** 2026 TDE programı tema/beceri temelli. Eski 49 konu (tür + dil bilgisi) pasife alındı; konular tema içindeki okuma türleri + yazma/konuşma uygulamaları. Dil bilgisi (sözcük türleri, yazım-noktalama) planda ayrı hafta olarak yok, 'kural uygulayabilme' süreç bileşenlerinde geçiyor — öğretmene sorulmalı.
  - **Yazım ve Noktalama Uygulamaları:** Planda ayrı hafta yok; yazma etkinliklerinde 'kural uygulayabilme' olarak geçiyor.
- **9. Sınıf Din Kültürü:** 
  - **Kur'an'dan Mesajlar (Ünite Sonu Sure ve Ayet İncelemeleri):** Her ünite sonunda tekrarlanan 'Kur'an'dan Mesajlar' tek konu olarak eklendi.
- **9. Sınıf İngilizce:** Hazırlık sınıfı bulunmayan lise planı esas alındı. Temalar konu olarak eklendi; YKS eşlemesi yok (YDT dili alanı için ileride).
- **10. Sınıf Matematik:** Mevcut 10. sınıf satırlarının bir kısmı (2025 sürümü adlarla) korunup 2026 adlarıyla yeniden adlandırıldı.
- **10. Sınıf Fizik:** Serbest düşme ve iki boyutta hareket 2026 planında 11. sınıfa taşınmış (11. Sınıf Fizik).
- **10. Sınıf Edebiyat:** Eski 4 satır tema adlarıydı (Sözün Ezgisi vb.); temalar 'unit' alanına, okuma türleri konuya dönüştü.
- **10. Sınıf Tarih:** Eski 3 satır ünite adlarıydı; ünitelerin ilk konusu olarak korunup yeniden adlandırıldı.
- **10. Sınıf Coğrafya:** Eski 7 satır ünite düzeyindeydi; konu düzeyine bölündü (eski satır ilgili ilk konu olarak korundu).
- **11. Sınıf Matematik:** Anadolu lisesi 11. sınıf (seçmeli/alan) matematik planı. 'Temel Matematik' (alan dışı) planı alınmadı.
- **11. Sınıf Coğrafya:** 11. sınıf 4 saatlik (seçmeli/alan) plan esas alındı; 2 saatlik planın bütün konularını kapsar. Öğrenci 2 saatlik dersi alıyorsa 'Yerleşmelerin Etki Alanları', 'Stratejik ve Kritik Madenler', 'Örnek Ülke' konuları okulda işlenmez.
- **11. Sınıf Felsefe:** 11. sınıf felsefe ünitelerinin AYT Felsefe Grubu konularıyla eşleşmesi zayıf (yeni program tematik).
- **11. Sınıf Mantık:** Plan dosyasında sınıf belirtilmemiş ('MANTIK' sayfası); 11. sınıf seçmeli kabul edildi.
- **11. Sınıf Psikoloji:** Plan dosyasında sınıf belirtilmemiş ('Psikoloji' sayfası); 11. sınıf seçmeli kabul edildi.
- **11. Sınıf İngilizce:** 2026-27 planında 11. sınıf İngilizce hâlâ eski program formatında (E11 kazanımları, 10 tema).

- **Genel:** Konu granülerliği "öğrencinin konu diye algılayacağı" düzeyde seçildi; planda tek hücrede
  birden çok alt konu varsa (ör. 9. sınıf Biyoloji organik moleküller) mevcut 9. sınıf ayrımı korundu.
- **Genel:** Yazılı haftaları planlarda yok; `school_calendar_weeks.is_exam_week` tahmini (7-8, 15-16, 26-27, 33-34).
- **Genel:** 11. sınıf Mantık ve Psikoloji plan dosyalarında sınıf belirtilmemiş; 11 kabul edildi.

## Emin olunmayan TYT/AYT eşlemeleri (güç < 0.5)

| Maarif dersi | Maarif konusu | YKS konusu | Güç |
|---|---|---|---|
| 9. Sınıf Matematik | Gerçek Sayı Aralıkları ile Yapılan İşlemler | TYT Matematik › Kümeler | 0.4 |
| 9. Sınıf Matematik | Doğrusal Fonksiyonlar ve Nitel Özellikleri | AYT Matematik › Fonksiyonlar ve Özellikleri | 0.4 |
| 9. Sınıf Fizik | Fizik Bilimi İle İlgili Kariyer Keşfi | TYT Fizik › Fizik Bilimine Giriş | 0.3 |
| 9. Sınıf Fizik | Vektörler | TYT Fizik › Kuvvet ve Hareket | 0.4 |
| 9. Sınıf Fizik | Enerji, Isı ve Sıcaklık Arasındaki İlişki | TYT Fizik › Enerji | 0.4 |
| 9. Sınıf Fizik | Hâl Değişimi | TYT Fizik › Madde ve Özellikleri | 0.4 |
| 9. Sınıf Kimya | Kimya Alanında Kariyer Olanakları | TYT Kimya › Kimya Bilimine Giriş | 0.3 |
| 9. Sınıf Kimya | Nanoparçacıklar ve Ekolojik Sürdürülebilirlik | TYT Kimya › Endüstride ve Çevrede Kimya | 0.4 |
| 9. Sınıf Kimya | Metal Nanoparçacıklar | TYT Kimya › Endüstride ve Çevrede Kimya | 0.3 |
| 9. Sınıf Kimya | Metal, Alaşım ve Metal Nanoparçacıkların Çevresel Etkileri | TYT Kimya › Doğa ve Kimya | 0.4 |
| 9. Sınıf Kimya | Metal, Alaşım ve Metal Nanoparçacıkların Çevresel Etkileri | TYT Kimya › Endüstride ve Çevrede Kimya | 0.4 |
| 9. Sınıf Kimya | Yeşil Kimyanın Atık Önleme İlkesi | TYT Kimya › Doğa ve Kimya | 0.4 |
| 9. Sınıf Biyoloji | Biyolojinin Önemi | TYT Biyoloji › Canlıların Ortak Özellikleri | 0.3 |
| 9. Sınıf Biyoloji | Bilimin Doğası, Bilimsel Araştırma Süreçleri, Bilim Etiği | TYT Biyoloji › Canlıların Ortak Özellikleri | 0.3 |
| 9. Sınıf Biyoloji | Nükleik Asitler | AYT Biyoloji › Genden Proteine (Nükleik Asitler ve Protein Sentezi) | 0.4 |
| 9. Sınıf Biyoloji | Biyoçeşitlilik | TYT Coğrafya › Biyoçeşitlilik | 0.4 |
| 9. Sınıf Edebiyat | Şiir (Sözün İnceliği) | TYT Türkçe › Sözcükte Anlam | 0.4 |
| 9. Sınıf Edebiyat | Mülakat (Çok Modlu Metin) | TYT Türkçe › Metin Türleri ve Anlatım | 0.4 |
| 9. Sınıf Edebiyat | Hikâye | TYT Türkçe › Paragraf | 0.4 |
| 9. Sınıf Edebiyat | Şiir Yazma | AYT Edebiyat › Şiir Bilgisi (Biçim ve İçerik) | 0.4 |
| 9. Sınıf Edebiyat | Belgesel ve İnfografik | TYT Türkçe › Metin Türleri ve Anlatım | 0.3 |
| 9. Sınıf Edebiyat | Sosyal Medya Dili ve Edebî Dil | TYT Türkçe › Anlatım Bozuklukları | 0.3 |
| 9. Sınıf Tarih | Tarih Araştırma ve Yazımında Dijitalleşme | TYT Tarih › Tarih Bilimine Giriş | 0.4 |
| 9. Sınıf Tarih | Orta Çağ'daki Başlıca Devletlerin Yönetim ve Ordu Yapıları | AYT Tarih › Türk - İslam Devletleri | 0.4 |
| 9. Sınıf Tarih | Orta Çağ'daki Ticaret Yolları | TYT Tarih › İlk Türk Devletleri (Orta Asya) | 0.4 |
| 9. Sınıf Coğrafya | İklim Sisteminde Yaşanan Değişiklikler | AYT Coğrafya › Çevre ve Toplum | 0.4 |
| 9. Sınıf Din Kültürü | İnsan ve İnsanın Yaratılışı | TYT Din Kültürü › İslam'ın Temel İnanç Esasları | 0.4 |
| 9. Sınıf Din Kültürü | Doğruyu Arayan Bir Varlık Olarak İnsan | TYT Din Kültürü › İslam'ın Temel Kaynakları | 0.4 |
| 10. Sınıf Matematik | Karekök Fonksiyonu ve Nitel Özellikleri | TYT Matematik › Köklü Sayılar | 0.3 |
| 10. Sınıf Matematik | Cebirsel ve Fonksiyonel İşlemlerin Algoritmik Yapısı | TYT Matematik › Rutin Olmayan Problemler | 0.4 |
| 10. Sınıf Fizik | Elektrik Güvenliği ve Topraklama | TYT Fizik › Elektrik Akımı | 0.4 |
| 10. Sınıf Fizik | Periyodik Hareketler | AYT Fizik › Basit Harmonik Hareket | 0.4 |
| 10. Sınıf Kimya | Çevresel ve Ekonomik Sürdürülebilirlik (Yeşil Kimya) | TYT Kimya › Endüstride ve Çevrede Kimya | 0.4 |
| 10. Sınıf Edebiyat | Şiir Dinletisi Hazırlama | AYT Edebiyat › Şiir Bilgisi (Biçim ve İçerik) | 0.4 |
| 10. Sınıf Edebiyat | Masal | AYT Edebiyat › Halk Edebiyatı | 0.4 |
| 10. Sınıf Edebiyat | Bilgilendirici Metni Edebî Metne Dönüştürme | TYT Türkçe › Metin Türleri ve Anlatım | 0.4 |
| 10. Sınıf Edebiyat | Fabl | AYT Edebiyat › Düz Yazı (Nesir) Türleri | 0.3 |
| 10. Sınıf Coğrafya | Türk Kültürünün Mekânsal Özellikleri | AYT Coğrafya › Küresel Ortam: Bölgeler ve Ülkeler | 0.4 |
| 10. Sınıf Felsefe | Felsefe, Mantık ve Argümantasyon | AYT Felsefe › Mantığa Giriş ve Klasik Mantık | 0.4 |
| 10. Sınıf Din Kültürü | Allah'ın Varlığının Delilleri | TYT Felsefe › Din Felsefesi | 0.3 |
| 10. Sınıf Din Kültürü | İslam ve Barış | TYT Din Kültürü › İslam'da Ahlak | 0.4 |
| 10. Sınıf Din Kültürü | İnsan, Çevre ve Ahlak | TYT Din Kültürü › İslam'da Ahlak | 0.4 |
| 10. Sınıf Din Kültürü | Teknoloji, Çevre ve Ahlak | AYT Din Kültürü › Güncel Dini Meseleler | 0.4 |
| 11. Sınıf Matematik | Üstel Fonksiyonlar ve Nitel Özellikleri | TYT Matematik › Üslü Sayılar | 0.4 |
| 11. Sınıf Fizik | Limit Hız | AYT Fizik › Newton'un Hareket Yasaları | 0.4 |
| 11. Sınıf Kimya | Yeşil Hidrojen ve Fermantasyon | TYT Kimya › Endüstride ve Çevrede Kimya | 0.3 |
| 11. Sınıf Kimya | Nanoteknolojik Ürünler | TYT Kimya › Endüstride ve Çevrede Kimya | 0.3 |
| 11. Sınıf Kimya | Mikroplastik ve Nanoplastikler | TYT Kimya › Doğa ve Kimya | 0.3 |
| 11. Sınıf Biyoloji | Homeostatik Yapılar ve Süreçler | AYT Biyoloji › Endokrin (Hormonal) Sistem | 0.4 |
| 11. Sınıf Biyoloji | Sistemlerin Eş Güdümlü Çalışması ve Homeostazinin Bozulması | AYT Biyoloji › Endokrin (Hormonal) Sistem | 0.4 |
| 11. Sınıf Edebiyat | Karagöz Oyunu | AYT Edebiyat › Halk Edebiyatı | 0.4 |
| 11. Sınıf Edebiyat | E-posta Yazma | TYT Türkçe › Yazım Kuralları | 0.3 |
| 11. Sınıf Edebiyat | Türk Dünyası Hikâyesi ve Anı | AYT Edebiyat › Düz Yazı (Nesir) Türleri | 0.4 |
| 11. Sınıf Edebiyat | Radyo Tiyatrosu | AYT Edebiyat › Tiyatro Türleri | 0.4 |
| 11. Sınıf Edebiyat | Küçürek Hikâye | AYT Edebiyat › Düz Yazı (Nesir) Türleri | 0.4 |
| 11. Sınıf Tarih | 1755 Lizbon ve 1766 İstanbul Depremleri | AYT Tarih › Osmanlı Devleti Gerileme | 0.3 |
| 11. Sınıf Tarih | Osmanlı'nın İnsanlık Tarihine Katkıları | AYT Tarih › Osmanlı Devleti Çöküş | 0.3 |
| 11. Sınıf Coğrafya | Mekânsal Sorunlar Karşısında Coğrafya Bilimi | AYT Coğrafya › Çevre ve Toplum | 0.4 |
| 11. Sınıf Coğrafya | Web Tabanlı CBS Uygulamaları | TYT Coğrafya › Harita Bilgisi | 0.4 |
| 11. Sınıf Coğrafya | Küresel İklim Değişikliği | TYT Coğrafya › Atmosfer ve İklim | 0.4 |
| 11. Sınıf Felsefe | Çevre ve İnsan İlişkisi, Çevre Etiği | AYT Felsefe › Ahlak Felsefesi (Etik) | 0.4 |
| 11. Sınıf Felsefe | Çevre ve İnsan İlişkisi, Çevre Etiği | TYT Felsefe › Ahlak Felsefesi | 0.3 |
| 11. Sınıf Felsefe | Teknoloji Bağlamında Ontolojik ve Aksiyolojik Problemler | AYT Felsefe › Varlık Felsefesi (Ontoloji) | 0.3 |
| 11. Sınıf Felsefe | Edebiyat-Felsefe İlişkisi | AYT Felsefe › Sanat Felsefesi (Estetik) | 0.3 |
| 11. Sınıf Felsefe | Hayatın Anlamına Yönelik Felsefi Sorular | AYT Felsefe › Felsefeye Giriş ve Tarihsel Gelişim | 0.3 |
| 11. Sınıf Felsefe | Hukuk Felsefesi | AYT Felsefe › Siyaset Felsefesi | 0.4 |
| 11. Sınıf Felsefe | Hukuk Felsefesi | AYT Felsefe › Ahlak Felsefesi (Etik) | 0.3 |
| 11. Sınıf Sosyoloji | Türkiye'de Sosyolojinin Gelişimi ve Edebiyatla İlişkisi | AYT Sosyoloji › Sosyolojiye Giriş | 0.4 |
| 11. Sınıf Mantık | Eklemler Mantığı | TYT Matematik › Mantık | 0.4 |
| 11. Sınıf Mantık | Mantık Çeşitleri ve Uygulamaları | AYT Felsefe › Mantık ve Dil | 0.4 |
| 11. Sınıf Psikoloji | Zekâ, Kişilik ve Benlik | AYT Felsefe › Psikolojinin Temel Süreçleri (Algı, Dikkat) | 0.4 |
| 11. Sınıf Psikoloji | İnsan Öğrenmesi ve Makine Öğrenmesi | AYT Felsefe › Öğrenme ve Bellek | 0.4 |
| 11. Sınıf Din Kültürü | Akıl, İrade ve Sorumluluk Sahibi Bir Varlık Olarak İnsan | TYT Din Kültürü › İslam'ın Temel İnanç Esasları | 0.4 |
| 11. Sınıf Din Kültürü | Din ve Sanat | AYT Din Kültürü › İslam ve Bilim | 0.4 |
| 11. Sınıf Din Kültürü | İslam Medeniyetinin Oluşumu ve İzleri | AYT Din Kültürü › İslam ve Bilim | 0.4 |
| 11. Sınıf Din Kültürü | İslam Medeniyetinin Bugünü ve Geleceği | AYT Din Kültürü › Güncel Dini Meseleler | 0.4 |
