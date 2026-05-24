# KoçUp Panel Sistemi — Proje Brief

## Vizyon

Öğrenci koçluk sürecini dijitalleştiren üç panelli (öğrenci/koç/müdür) bir SaaS. İlerde koçluk merkezlerine satılacak — **multi-tenant düşün**.

## Üç Panel

### Öğrenci Paneli (`/ogrenci/*`)
- Kendi gelişim verilerini görür (konu ilerlemesi, deneme netleri, soru istatistikleri)
- Haftalık ders programını görür
- Günlük soru çözüm girişi yapabilir
- Deneme sonucu girebilir
- Koçun atadığı konuları görür, "tamamladım" işaretleyebilir

### Koç Paneli (`/koc/*`)
- Sadece kendisine atanmış öğrencileri görür
- Her öğrenci için: konu takibi, ders programı, deneme analizi, soru istatistikleri
- Öğrenciye özel müfredat ekleyebilir/düzenleyebilir
- Haftalık ders programı oluşturabilir
- Öğrencinin girdiği denemeleri görür, kendisi de girebilir

### Müdür Paneli (`/mudur/*`)
- TÜM koçları ve TÜM öğrencileri görür
- Gelen öğrenci başvurularını onaylar/reddeder
- Onayladığı öğrenciyi bir koça atar
- Yeni koç ekler (email daveti)
- Sistem istatistikleri (toplam koç/öğrenci/aktif başvuru)

## Auth Akışı

- Ana sayfada iki buton: **Öğrenci Girişi** | **Koç Girişi**
- **Öğrenci:** Login VEYA "Başvur" → `/basvuru` (public form) → müdür onayı → davet emaili → şifre belirle → giriş
- **Koç:** Sadece login. Signup YOK. Müdür ekler, davet gider, koç şifre belirler.
- **Müdür:** İlk müdür DB seed. Sonradan müdür panelden eklenebilir (MVP'de tek müdür).

## Başvuru Formu

```
Ad Soyad *
Email *
Telefon *
Sınıf * (9 | 10 | 11 | 12 | Mezun)
Hedef Bölüm/Üniversite (opsiyonel)
Hedef Sıralama (opsiyonel, sayı)
Veli Adı Soyadı *
Veli Telefonu *
```

## Müfredat

İki katmanlı:
1. **Global YKS müfredatı** (seed) — TYT + AYT tüm dersler/konular
2. **Öğrenciye özel** — koç global'den seçer veya custom ekler

Konu statüleri: `basla` | `devam` | `tamam` | `tekrar`

## Veritabanı Tabloları

- `profiles` (id, role, full_name, email, phone, avatar_url)
- `applications` (başvurular — pending/approved/rejected)
- `students` (profile uzantısı — coach_id, grade, target, parent info)
- `subjects` (global dersler — TYT/AYT)
- `topics` (global konular, subject FK)
- `student_topics` (öğrenciye atanmış konular + status)
- `study_sessions` (günlük soru çözüm)
- `exams` (deneme meta)
- `exam_results` (ders bazlı net)
- `schedule` (haftalık program)

Detaylı şema 02-supabase-rls.md'de.

## RLS Mantığı

- Öğrenci: sadece kendi verisi
- Koç: sadece kendi öğrencilerinin verisi (`students.coach_id = auth.uid()`)
- Admin: her şey
- Helper functions: `current_user_role()`, `is_coach_of(student_uuid)`

## Onay Akışı (kritik)

Müdür "Onayla" deyince tek Postgres function (`approve_application`) ile atomik olarak:
1. Supabase auth user oluştur
2. Invite email gönder
3. `profiles` satırı oluştur (role='student')
4. `students` satırı oluştur (başvuru bilgileriyle)
5. `applications.status = 'approved'` + `approved_student_id` set
6. (Opsiyonel) Koç ataması aynı adımda veya sonradan

Aynı pattern koç ekleme için: `invite_coach(email, full_name)`.

## UI

- shadcn/ui components
- Primary: `#1B6B8A` blue / Accent: `#F97316` orange
- Recharts grafikler: Radar (ders başarı), Bar (soru sayıları), Line (haftalık trend), Area (deneme net seyri)
- Mobile-first, sidebar mobilde sheet
- Boş durumlar için friendly mesajlar

## Sayfa Yapısı

```
app/
├── (public)/
│   ├── page.tsx                    # Landing
│   ├── basvuru/page.tsx            # Başvuru formu
│   ├── giris/
│   │   ├── ogrenci/page.tsx
│   │   └── koc/page.tsx
│   └── sifre-belirle/page.tsx      # Davet linki buraya
├── ogrenci/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── konularim/page.tsx
│   ├── denemelerim/page.tsx
│   ├── program/page.tsx
│   └── soru-cozum/page.tsx
├── koc/
│   ├── layout.tsx
│   ├── page.tsx                    # Öğrenci listesi
│   └── ogrenci/[id]/
│       ├── page.tsx
│       ├── konular/page.tsx
│       ├── program/page.tsx
│       ├── denemeler/page.tsx
│       └── soru-cozum/page.tsx
└── mudur/
    ├── layout.tsx
    ├── page.tsx                    # Dashboard
    ├── basvurular/page.tsx
    ├── koclar/page.tsx
    ├── ogrenciler/page.tsx
    └── mufredat/page.tsx
```

## Teslim Sırası

1. Keşif (mevcut yapı taraması)
2. Supabase tablo + RLS + helper functions
3. YKS müfredat seed
4. Auth (login, başvuru, middleware, davet)
5. Müdür paneli
6. Koç paneli
7. Öğrenci paneli
8. Soru çözüm + deneme giriş formları
9. Grafikler ve dashboard'lar
10. Haftalık ders programı