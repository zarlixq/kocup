-- topics tablosu: her derse ait YKS konuları
create table public.topics (
  id         uuid        primary key default gen_random_uuid(),
  subject_id uuid        not null references public.subjects(id) on delete cascade,
  name       text        not null,
  "order"    integer     not null,
  created_at timestamptz default now(),
  unique (subject_id, name)
);

alter table public.topics enable row level security;
create policy "topics_read_all" on public.topics for select using (true);

create index on public.topics (subject_id);
create index on public.topics (subject_id, "order");

-- ─────────────────────────────────────────
-- TYT TÜRKÇE
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Sözcükte Anlam',            1),
  ('Cümlede Anlam',             2),
  ('Paragraf',                  3),
  ('İsim (Ad) ve Türleri',      4),
  ('Sıfat (Önad)',              5),
  ('Zamir (Adıl)',              6),
  ('Zarf (Belirteç)',           7),
  ('Edat, Bağlaç, Ünlem',       8),
  ('Fiil (Eylem)',              9),
  ('Fiilimsi',                  10),
  ('Cümlenin Öğeleri',          11),
  ('Cümle Türleri',             12),
  ('Ses Bilgisi',               13),
  ('Sözcükte Yapı',             14),
  ('Yazım Kuralları',           15),
  ('Noktalama İşaretleri',      16),
  ('Anlatım Bozuklukları',      17),
  ('Deyimler ve Atasözleri',    18),
  ('Metin Türleri ve Anlatım',  19)
) as t(name, ord)
where s.name = 'TYT Türkçe';

-- ─────────────────────────────────────────
-- TYT MATEMATİK
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Temel Kavramlar',                        1),
  ('Sayı Basamakları',                       2),
  ('Bölme ve Bölünebilme',                   3),
  ('EBOB - EKOK',                            4),
  ('Rasyonel Sayılar',                       5),
  ('Basit Eşitsizlikler',                    6),
  ('Mutlak Değer',                           7),
  ('Üslü Sayılar',                           8),
  ('Köklü Sayılar',                          9),
  ('Çarpanlara Ayırma',                      10),
  ('Oran - Orantı',                          11),
  ('Denklem Çözme',                          12),
  ('Sayı ve Kesir Problemleri',              13),
  ('Yaş ve Yüzde Problemleri',               14),
  ('Kar - Zarar ve Faiz Problemleri',        15),
  ('Karışım Problemleri',                    16),
  ('İşçi - Havuz Problemleri',               17),
  ('Hareket Problemleri',                    18),
  ('Kümeler',                                19),
  ('Mantık',                                 20),
  ('Fonksiyonlar',                           21),
  ('Polinomlar',                             22),
  ('2. Dereceden Denklemler',                23),
  ('Permütasyon - Kombinasyon',              24),
  ('Olasılık',                               25),
  ('Veri ve İstatistik',                     26)
) as t(name, ord)
where s.name = 'TYT Matematik';

-- ─────────────────────────────────────────
-- TYT GEOMETRİ
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Temel Geometri Kavramları',           1),
  ('Açılar',                             2),
  ('Üçgenler',                           3),
  ('Üçgenlerde Eşlik ve Benzerlik',       4),
  ('Özel Üçgenler',                      5),
  ('Dörtgenler',                         6),
  ('Çokgenler',                          7),
  ('Çember ve Daire',                    8),
  ('Çemberde Açılar ve Yaylar',          9),
  ('Katı Cisimler',                      10),
  ('Alan ve Çevre Hesapları',            11),
  ('Dönüşüm Geometrisi',                 12)
) as t(name, ord)
where s.name = 'TYT Geometri';

-- ─────────────────────────────────────────
-- TYT FİZİK
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Fizik Bilimine Giriş',     1),
  ('Madde ve Özellikleri',     2),
  ('Basınç',                   3),
  ('Hareket',                  4),
  ('Kuvvet ve Hareket',        5),
  ('Enerji',                   6),
  ('Isı ve Sıcaklık',          7),
  ('Elektrostatik',            8),
  ('Elektrik Akımı',           9),
  ('Manyetizma',               10),
  ('Dalgalar',                 11),
  ('Optik',                    12)
) as t(name, ord)
where s.name = 'TYT Fizik';

-- ─────────────────────────────────────────
-- TYT KİMYA
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Kimya Bilimine Giriş',                    1),
  ('Atom ve Periyodik Tablo',                 2),
  ('Kimyasal Bağlar',                         3),
  ('Mol Kavramı ve Kimyasal Hesaplamalar',     4),
  ('Kimyasal Tepkimeler',                     5),
  ('Asitler, Bazlar ve Tuzlar',               6),
  ('Maddenin Halleri',                        7),
  ('Karışımlar',                              8),
  ('Çözeltiler',                              9),
  ('Elektrokimyaya Giriş',                    10),
  ('Organik Kimyaya Giriş',                   11),
  ('Endüstride ve Çevrede Kimya',             12)
) as t(name, ord)
where s.name = 'TYT Kimya';

-- ─────────────────────────────────────────
-- TYT BİYOLOJİ
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Canlıların Ortak Özellikleri',                1),
  ('Canlıların Temel Bileşenleri',                2),
  ('Hücre',                                       3),
  ('Canlıların Çeşitliliği ve Sınıflandırılması', 4),
  ('Bitki Biyolojisi',                            5),
  ('Sindirim Sistemi',                            6),
  ('Dolaşım Sistemi',                             7),
  ('Solunum Sistemi',                             8),
  ('Boşaltım Sistemi',                            9),
  ('Üreme ve Gelişme',                            10),
  ('Kalıtım',                                     11),
  ('Ekosistem ve Ekoloji',                        12),
  ('Güncel Çevre Sorunları',                      13)
) as t(name, ord)
where s.name = 'TYT Biyoloji';

-- ─────────────────────────────────────────
-- TYT TARİH
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Tarih Bilimine Giriş',                      1),
  ('Uygarlığın Doğuşu',                         2),
  ('İlk Çağ Uygarlıkları',                      3),
  ('İlk Türk Devletleri (Orta Asya)',            4),
  ('İslamiyet''in Doğuşu ve Yayılması',          5),
  ('Türklerin İslamiyet''i Kabulü',              6),
  ('İlk Müslüman Türk Devletleri',               7),
  ('Anadolu''da Türk Beylikleri ve Selçuklular', 8),
  ('Osmanlı Devleti Kuruluş ve Yükselme',        9),
  ('Osmanlı Devleti Duraklama ve Gerileme',      10),
  ('Osmanlı Devleti Çöküş Dönemi',               11),
  ('Birinci Dünya Savaşı',                       12),
  ('Kurtuluş Savaşı',                            13),
  ('Atatürk İlkeleri ve İnkılapları',            14),
  ('Soğuk Savaş ve Türkiye',                     15)
) as t(name, ord)
where s.name = 'TYT Tarih';

-- ─────────────────────────────────────────
-- TYT COĞRAFYA
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Doğa ve İnsan',                         1),
  ('Dünya''nın Şekli ve Hareketleri',        2),
  ('Harita Bilgisi',                         3),
  ('Kayaçlar ve Mineraller',                 4),
  ('İç Kuvvetler ve Yer Şekilleri',          5),
  ('Dış Kuvvetler ve Yer Şekilleri',         6),
  ('Atmosfer ve İklim',                      7),
  ('Yeryüzünde Su (Hidrosfer)',              8),
  ('Toprak',                                 9),
  ('Biyoçeşitlilik',                         10),
  ('Nüfus',                                  11),
  ('Göç',                                    12),
  ('Yerleşme',                               13),
  ('Türkiye''nin Coğrafi Özellikleri',        14),
  ('Türkiye''de Ekonomik Faaliyetler',        15)
) as t(name, ord)
where s.name = 'TYT Coğrafya';

-- ─────────────────────────────────────────
-- TYT FELSEFE
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Felsefeye Giriş',              1),
  ('Bilgi Felsefesi',              2),
  ('Varlık Felsefesi',             3),
  ('Ahlak Felsefesi',              4),
  ('Siyaset Felsefesi',            5),
  ('Estetik',                      6),
  ('Din Felsefesi',                7),
  ('Psikolojiye Giriş',            8),
  ('Sosyal Psikoloji ve Toplum',   9),
  ('Mantık',                       10)
) as t(name, ord)
where s.name = 'TYT Felsefe';

-- ─────────────────────────────────────────
-- TYT DİN KÜLTÜRÜ
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('İslam''ın Temel Kaynakları',       1),
  ('Hz. Muhammed''in Hayatı',          2),
  ('İslam''ın Temel İnanç Esasları',   3),
  ('İslam''da İbadet',                 4),
  ('İslam''da Ahlak',                  5),
  ('Kur''an ve Yorumu',                6),
  ('Tasavvuf',                         7),
  ('Laiklik ve Din',                   8),
  ('Diğer Din ve İnanışlar',           9),
  ('İslam Düşünce Akımları',           10)
) as t(name, ord)
where s.name = 'TYT Din Kültürü';

-- ─────────────────────────────────────────
-- AYT MATEMATİK
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Fonksiyonlar ve Özellikleri',             1),
  ('Trigonometri',                            2),
  ('Logaritma',                               3),
  ('Karmaşık Sayılar',                        4),
  ('Polinomlar',                              5),
  ('2. Dereceden Fonksiyonlar ve Denklemler', 6),
  ('Aritmetik Diziler',                       7),
  ('Geometrik Diziler',                       8),
  ('Limit ve Süreklilik',                     9),
  ('Türev',                                   10),
  ('İntegral',                                11),
  ('Permütasyon ve Kombinasyon',              12),
  ('Binom Açılımı',                           13),
  ('Olasılık',                                14),
  ('İstatistik',                              15)
) as t(name, ord)
where s.name = 'AYT Matematik';

-- ─────────────────────────────────────────
-- AYT GEOMETRİ
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Analitik Geometri - Nokta',           1),
  ('Analitik Geometri - Doğru',           2),
  ('Analitik Geometri - Çember',          3),
  ('Analitik Geometri - Konikler',        4),
  ('Vektörler',                           5),
  ('Uzayda Doğru ve Düzlem',             6),
  ('Uzay Geometri',                       7),
  ('Katı Cisimler - Yüzey Alanı',         8),
  ('Katı Cisimler - Hacim',               9),
  ('Dönüşüm Geometrisi',                  10)
) as t(name, ord)
where s.name = 'AYT Geometri';

-- ─────────────────────────────────────────
-- AYT FİZİK
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Vektörler',                                    1),
  ('Kuvvet, Tork ve Denge',                        2),
  ('Kütle Merkezi',                                3),
  ('Basit Makineler',                              4),
  ('Doğrusal Hareket',                             5),
  ('Newton''un Hareket Yasaları',                  6),
  ('İş, Güç ve Enerji',                            7),
  ('Atışlar',                                      8),
  ('İtme - Momentum',                              9),
  ('Elektrik Alan ve Potansiyel',                  10),
  ('Manyetik Alan',                                11),
  ('İndüksiyon',                                   12),
  ('Alternatif Akım',                              13),
  ('Transformatörler',                             14),
  ('Dalga Mekaniği',                               15),
  ('Atom Fiziği',                                  16),
  ('Modern Fizik',                                 17),
  ('Modern Fiziğin Teknolojideki Uygulamaları',    18)
) as t(name, ord)
where s.name = 'AYT Fizik';

-- ─────────────────────────────────────────
-- AYT KİMYA
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Kimyasal Kinetik',                      1),
  ('Kimyasal Denge',                        2),
  ('Asit - Baz Dengesi',                    3),
  ('Çözünürlük Dengesi',                    4),
  ('Elektrokimya',                          5),
  ('Organik Kimyaya Giriş',                 6),
  ('Hidrokarbonlar - Alkanlar',             7),
  ('Hidrokarbonlar - Alkenler ve Alkinler', 8),
  ('Hidrokarbonlar - Aromatikler',          9),
  ('Fonksiyonlu Organik Bileşikler',        10),
  ('Karbonhidratlar, Yağlar ve Proteinler', 11),
  ('Polimerler',                            12),
  ('Nükleer Tepkimeler',                    13),
  ('Kimya ve Enerji',                       14)
) as t(name, ord)
where s.name = 'AYT Kimya';

-- ─────────────────────────────────────────
-- AYT BİYOLOJİ
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Hücre Zarı ve Madde Geçişi',          1),
  ('Hücre Organelleri',                    2),
  ('Bölünme - Mitoz',                      3),
  ('Bölünme - Mayoz',                      4),
  ('Mendel Genetiği',                      5),
  ('Kan Grupları ve Eşey Bağlantılı Kalıtım', 6),
  ('Bağlantı ve Taşınım Genetiği',         7),
  ('Mutasyon ve Modifikasyon',             8),
  ('Biyoteknoloji ve Gen Mühendisliği',    9),
  ('Sinir Sistemi',                        10),
  ('Endokrin (Hormonal) Sistem',           11),
  ('Üreme Sistemi ve Embriyoloji',         12),
  ('Bağışıklık Sistemi',                   13),
  ('Sindirim, Dolaşım, Solunum, Boşaltım', 14),
  ('Evrim',                                15),
  ('Ekoloji ve Ekosistem',                 16)
) as t(name, ord)
where s.name = 'AYT Biyoloji';

-- ─────────────────────────────────────────
-- AYT EDEBİYAT
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('İslamiyet Öncesi Türk Edebiyatı',                     1),
  ('İslamiyet''e Geçiş Dönemi Türk Edebiyatı',            2),
  ('Divan Edebiyatı',                                      3),
  ('Halk Edebiyatı',                                       4),
  ('Tanzimat Edebiyatı (1. Dönem)',                        5),
  ('Tanzimat Edebiyatı (2. Dönem)',                        6),
  ('Servet-i Fünun Edebiyatı',                             7),
  ('Fecr-i Ati Edebiyatı',                                 8),
  ('Milli Edebiyat Dönemi',                                9),
  ('Cumhuriyet Dönemi Türk Edebiyatı (1923-1950)',         10),
  ('Cumhuriyet Dönemi Türk Edebiyatı (1950 Sonrası)',      11),
  ('Şiir Bilgisi (Biçim ve İçerik)',                       12),
  ('Düz Yazı (Nesir) Türleri',                             13),
  ('Tiyatro Türleri',                                      14),
  ('Söz Sanatları',                                        15),
  ('Türkçenin Tarihi Gelişimi',                            16)
) as t(name, ord)
where s.name = 'AYT Edebiyat';

-- ─────────────────────────────────────────
-- AYT TARİH
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Tarih Felsefesi ve Tarih Yazımı',             1),
  ('Orta Asya Türk Tarihi',                       2),
  ('İslam Medeniyeti',                            3),
  ('Türk - İslam Devletleri',                     4),
  ('Selçuklu Devleti',                            5),
  ('Osmanlı Devleti Kuruluş',                     6),
  ('Osmanlı Devleti Yükselme',                    7),
  ('Osmanlı Devleti Duraklama',                   8),
  ('Osmanlı Devleti Gerileme',                    9),
  ('Osmanlı Devleti Çöküş',                       10),
  ('Birinci Dünya Savaşı',                        11),
  ('Milli Mücadele',                              12),
  ('Türk İnkılabı',                               13),
  ('Atatürk Dönemi Türk Dış Politikası',          14),
  ('İkinci Dünya Savaşı ve Türkiye',              15),
  ('Soğuk Savaş Dönemi',                          16),
  ('Yakın Dönem Türkiye Tarihi',                  17),
  ('Uluslararası İlişkiler ve Küreselleşme',      18)
) as t(name, ord)
where s.name = 'AYT Tarih';

-- ─────────────────────────────────────────
-- AYT COĞRAFYA
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Doğal Sistemler',                                     1),
  ('Beşeri Sistemler',                                    2),
  ('Ekonomik Faaliyetler',                                3),
  ('Küresel Ortam: Bölgeler ve Ülkeler',                  4),
  ('Çevre ve Toplum',                                     5),
  ('Kalkınma ve Çevre',                                   6),
  ('Marmara ve Ege Bölgesi Coğrafyası',                   7),
  ('Akdeniz ve Güneydoğu Anadolu Bölgesi Coğrafyası',     8),
  ('İç Anadolu Bölgesi Coğrafyası',                       9),
  ('Karadeniz Bölgesi Coğrafyası',                        10),
  ('Doğu Anadolu Bölgesi Coğrafyası',                     11),
  ('Türkiye''nin Genel Ekonomik Coğrafyası',               12)
) as t(name, ord)
where s.name = 'AYT Coğrafya';

-- ─────────────────────────────────────────
-- AYT FELSEFE
-- ─────────────────────────────────────────
insert into public.topics (subject_id, name, "order")
select s.id, t.name, t.ord from public.subjects s,
(values
  ('Felsefeye Giriş ve Tarihsel Gelişim',      1),
  ('Varlık Felsefesi (Ontoloji)',               2),
  ('Bilgi Felsefesi (Epistemoloji)',             3),
  ('Ahlak Felsefesi (Etik)',                    4),
  ('Siyaset Felsefesi',                         5),
  ('Sanat Felsefesi (Estetik)',                 6),
  ('Din Felsefesi',                             7),
  ('Bilim Felsefesi',                           8),
  ('Psikolojiye Giriş',                         9),
  ('Psikolojinin Temel Süreçleri (Algı, Dikkat)', 10),
  ('Öğrenme ve Bellek',                         11),
  ('Motivasyon ve Duygu',                       12),
  ('Sosyal Psikoloji',                          13),
  ('Psikoloji ve Ruh Sağlığı',                  14),
  ('Mantığa Giriş ve Klasik Mantık',            15),
  ('Sembolik Mantık',                           16)
) as t(name, ord)
where s.name = 'AYT Felsefe';
