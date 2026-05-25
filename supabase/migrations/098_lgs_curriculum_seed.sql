-- ─────────────────────────────────────────────────────────────────────────
-- LGS Müfredat Seed — MEB 2024-2025
-- 6 ders + 54 konu (8. sınıf müfredatı)
-- Idempotent: ON CONFLICT (subjects) + WHERE NOT EXISTS (topics)
-- ─────────────────────────────────────────────────────────────────────────

-- 1) CHECK constraint'i genişlet ('lgs' ekle)
alter table public.subjects drop constraint if exists subjects_exam_type_check;
alter table public.subjects add constraint subjects_exam_type_check
  check (exam_type in ('tyt', 'ayt', 'lgs'));

-- 2) LGS Dersleri (order: TYT 1-10, AYT 11-19, LGS 20-25)
insert into public.subjects (name, color, "order", exam_type) values
  ('LGS Türkçe',              '#EF4444', 20, 'lgs'),
  ('LGS Matematik',           '#3B82F6', 21, 'lgs'),
  ('LGS Fen Bilimleri',       '#22C55E', 22, 'lgs'),
  ('LGS T.C. İnkılap Tarihi', '#A855F7', 23, 'lgs'),
  ('LGS Din Kültürü',         '#64748B', 24, 'lgs'),
  ('LGS İngilizce',           '#F59E0B', 25, 'lgs')
on conflict (name) do nothing;

-- 3) LGS Konuları (idempotent: aynı (subject_id, name) varsa atla)
with topic_data(subject_name, topic_name, topic_order) as (
  values
    -- LGS Türkçe (12)
    ('LGS Türkçe', 'Sözcükte Anlam',          1),
    ('LGS Türkçe', 'Cümlede Anlam',           2),
    ('LGS Türkçe', 'Paragrafta Anlam',        3),
    ('LGS Türkçe', 'Söz Sanatları',           4),
    ('LGS Türkçe', 'Anlatım Bozuklukları',    5),
    ('LGS Türkçe', 'Fiilimsiler',             6),
    ('LGS Türkçe', 'Cümlenin Ögeleri',        7),
    ('LGS Türkçe', 'Fiilde Çatı',             8),
    ('LGS Türkçe', 'Cümle Türleri',           9),
    ('LGS Türkçe', 'Yazım Kuralları',        10),
    ('LGS Türkçe', 'Noktalama İşaretleri',   11),
    ('LGS Türkçe', 'Metin Türleri',          12),

    -- LGS Matematik (12)
    ('LGS Matematik', 'Çarpanlar ve Katlar',                1),
    ('LGS Matematik', 'Üslü İfadeler',                      2),
    ('LGS Matematik', 'Kareköklü İfadeler',                 3),
    ('LGS Matematik', 'Veri Analizi',                       4),
    ('LGS Matematik', 'Olasılık',                           5),
    ('LGS Matematik', 'Cebirsel İfadeler ve Özdeşlikler',   6),
    ('LGS Matematik', 'Doğrusal Denklemler',                7),
    ('LGS Matematik', 'Eşitsizlikler',                      8),
    ('LGS Matematik', 'Üçgenler',                           9),
    ('LGS Matematik', 'Eşlik ve Benzerlik',                10),
    ('LGS Matematik', 'Dönüşüm Geometrisi',                11),
    ('LGS Matematik', 'Geometrik Cisimler',                12),

    -- LGS Fen Bilimleri (8)
    ('LGS Fen Bilimleri', 'Mevsimler ve İklim',                          1),
    ('LGS Fen Bilimleri', 'DNA ve Genetik Kod',                          2),
    ('LGS Fen Bilimleri', 'Basınç',                                      3),
    ('LGS Fen Bilimleri', 'Madde ve Endüstri',                           4),
    ('LGS Fen Bilimleri', 'Basit Makineler',                             5),
    ('LGS Fen Bilimleri', 'Enerji Dönüşümleri ve Çevre Bilimi',          6),
    ('LGS Fen Bilimleri', 'Elektrik Yükleri ve Elektrik Enerjisi',       7),
    ('LGS Fen Bilimleri', 'Canlılar ve Enerji İlişkileri',               8),

    -- LGS T.C. İnkılap Tarihi (7)
    ('LGS T.C. İnkılap Tarihi', 'Bir Kahraman Doğuyor',                                  1),
    ('LGS T.C. İnkılap Tarihi', 'Millî Uyanış: Bağımsızlık Yolunda Atılan Adımlar',     2),
    ('LGS T.C. İnkılap Tarihi', 'Millî Bir Destan: Ya İstiklal Ya Ölüm!',                3),
    ('LGS T.C. İnkılap Tarihi', 'Atatürkçülük ve Çağdaşlaşan Türkiye',                  4),
    ('LGS T.C. İnkılap Tarihi', 'Demokratikleşme Çabaları',                             5),
    ('LGS T.C. İnkılap Tarihi', 'Atatürk Dönemi Türk Dış Politikası',                   6),
    ('LGS T.C. İnkılap Tarihi', 'Atatürk''ün Ölümü ve Sonrası',                         7),

    -- LGS Din Kültürü (5)
    ('LGS Din Kültürü', 'Kader İnancı',                                  1),
    ('LGS Din Kültürü', 'Zekât ve Sadaka',                               2),
    ('LGS Din Kültürü', 'Din ve Hayat',                                  3),
    ('LGS Din Kültürü', 'Hz. Muhammed''in Hayatından Örnek Davranışlar', 4),
    ('LGS Din Kültürü', 'Kur''an''da Akıl ve Bilgi',                     5),

    -- LGS İngilizce (10)
    ('LGS İngilizce', 'Friendship',       1),
    ('LGS İngilizce', 'Teen Life',        2),
    ('LGS İngilizce', 'In the Kitchen',   3),
    ('LGS İngilizce', 'On the Phone',     4),
    ('LGS İngilizce', 'The Internet',     5),
    ('LGS İngilizce', 'Adventures',       6),
    ('LGS İngilizce', 'Tourism',          7),
    ('LGS İngilizce', 'Chores',           8),
    ('LGS İngilizce', 'Science',          9),
    ('LGS İngilizce', 'Natural Forces',  10)
)
insert into public.topics (subject_id, name, "order")
select s.id, td.topic_name, td.topic_order
from topic_data td
join public.subjects s on s.name = td.subject_name
where not exists (
  select 1 from public.topics tx
  where tx.subject_id = s.id and tx.name = td.topic_name
);
