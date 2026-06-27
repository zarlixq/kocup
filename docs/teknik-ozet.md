# KoçUp — Eksiksiz Teknik Özet

> Bu belge, kod tabanı doğrudan okunarak hazırlanmıştır (tahmin yok). Kuruma (dershane) tanıtım ve geliştirme planlaması için hazırlanmıştır.
> Hazırlanma tarihi referansı: 2026-06-23. Canlı Supabase projesi: `ibvgnmtrbfezjsrluflz` ("kocup", Postgres 17).

---

## 1. PROJE GENEL YAPISI

### Tech Stack ve Versiyonlar

| Katman | Teknoloji | Versiyon | Not |
|---|---|---|---|
| Framework | Next.js | **16.2.4** (sabit) | App Router, RSC, Server Actions |
| UI runtime | React / React DOM | **19.2.4** (sabit) | React 19 |
| Dil | TypeScript | ^6.0.3 | `strict: true`, target ES2022 |
| Styling | Tailwind CSS | **^4.2.4** | **v4 CSS-first** — ayrı `tailwind.config` YOK, konfig `app/globals.css` içinde |
| Component lib | shadcn/ui | "new-york" stili | 22 component yüklü (`components/ui/`) |
| Backend | Supabase JS / SSR | `@supabase/supabase-js` ^2.106.1, `@supabase/ssr` ^0.10.3 | auth + db + RLS + storage |
| Grafik | Recharts | ^3.8.1 | Dashboard grafikleri |
| Client state | Zustand | ^5.0.14 | Sadece Pomodoro store |
| Validasyon | Zod | **^4.4.3** (v4) | Tüm form/server action doğrulamaları |
| Form | react-hook-form + @hookform/resolvers | ^7.76.1 / ^5.4.0 | RHF + Zod köprüsü |
| Bildirim | Sonner | ^2.0.7 | Toast |
| İkon | lucide-react | ^1.16.0 | |
| Markdown | react-markdown ^10, @uiw/react-md-editor ^4.1.1, remark-gfm, rehype-raw, rehype-sanitize | | Blog CMS (editör + güvenli render) |
| Tarih | date-fns | ^4.2.1 | |

devDependencies: `eslint` ^9 + `eslint-config-next` 16.2.4, `@types/*`.

### Klasör Yapısı (NO src dir — kök `app/`)

```
app/
├── (public)/          # Auth gerektirmeyen kamuya açık site
│   ├── page.tsx              # Ana sayfa (landing)
│   ├── kurumlar/             # B2B tanıtım + demo formu
│   ├── basvuru/              # Öğrenci başvuru formu (LGS/YKS segment)
│   ├── blog/                 # Blog listesi + [slug] + kategori/[slug]
│   ├── araclar/              # Ücretsiz araçlar (net-hesaplama, geri-sayim, pomodoro, tercih-rehberi)
│   ├── giris/                # Rol bazlı giriş: ogrenci / koc / mudur
│   ├── sifre-belirle/        # Davet/recovery sonrası şifre belirleme
│   └── sifremi-unuttum/      # Şifre sıfırlama
├── ogrenci/           # role='student'
├── koc/               # role='coach'
├── mudur/             # role='admin' (platform müdürü)
├── kurum/             # role='org_admin' (B2B kurum yöneticisi) — YENİ
├── auth/callback/     # Davet/recovery callback (route handler + client)
├── api/track/         # Anonim analytics tracking (tek API route)
├── layout.tsx         # Root layout (fontlar, Google Ads gtag, metadata/OG)
├── robots.ts, sitemap.ts, opengraph-image.tsx, twitter-image.tsx
└── error.tsx, not-found.tsx, globals.css

components/
├── ui/                # 22 shadcn componenti
└── [feature]/         # analytics, blog, charts (8 Recharts), denemeler, koc,
                       # konu-analizi, konular, kurum, mudur, ogrenci, pomodoro,
                       # randevu, schedule, seo, shared, takip, tools

lib/
├── supabase/          # client.ts (browser), server.ts (RSC), admin.ts (service role), middleware.ts
├── auth/              # current-user, invite, resend
├── appointments/      # constants, recurrence
├── analytics/         # range, track
├── assignments/, curriculum/, blog/, charts/, pomodoro/, seo/
├── database.types.ts  # 1306 satır, üretilmiş tipler
└── utils, format, payments, slug, site-url, exam-target, coach-source, user-status

blocks/                # Landing page bölümleri (Hero, Navbar, Pricing, FAQ, Footer, vb. — 13 dosya)
supabase/migrations/   # 37 SQL migration (canlı DB 40 migration — repo tam senkron DEĞİL)
docs/                  # audit-report.md, b2b-refactor-plan.md
public/                # images/logo.png, og-image.png
```

### Config Özeti

- **next.config.mjs**: image `remotePatterns` → `images.unsplash.com`, `images.pexels.com`, `*.supabase.co`.
- **tsconfig.json**: strict, path alias `@/*` → `./*` (kök), `moduleResolution: bundler`.
- **postcss.config.mjs**: tek eklenti `@tailwindcss/postcss` (v4).
- **components.json**: shadcn new-york, RSC açık, baseColor neutral.
- **proxy.ts** (Next 16'da `middleware.ts` yerine): `lib/supabase/middleware.ts:updateSession`'a delege eder.

### Deployment / Hosting

- **Vercel** hedefli (standart Next.js akışı). `vercel.json`, `Dockerfile`, `docker-compose` YOK — özel deployment config yok.
- Gerekli env değişkenleri (`.env.local.example`):

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Evet (server) | Admin işlemleri (davet vb.) — client'a expose edilmez |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical/SEO; varsayılan `https://www.kocupakedemi.com` |
| `GOOGLE_SITE_VERIFICATION` | Opsiyonel | Search Console |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` | Opsiyonel | Google Ads conversion (boşsa kodda gömülü `AW-18185085898` fallback) |

### NPM Scripts
`dev`, `build`, `start`, `lint` (eslint), `type-check` (tsc --noEmit).

---

## 2. KULLANICI ROLLERİ VE PANELLER

### 4 Rol (`profiles.role`)

| Rol (DB) | Türkçe | Panel | Giriş sayfası |
|---|---|---|---|
| `student` | Öğrenci | `/ogrenci` | `/giris/ogrenci` |
| `coach` | Koç | `/koc` | `/giris/koc` |
| `admin` | Müdür (platform) | `/mudur` | `/giris/mudur` |
| `org_admin` | Kurum yöneticisi (B2B) | `/kurum` | `/giris/koc` (paylaşımlı) |

> Not: CLAUDE.md 3 rol (student/coach/admin) belgeliyor, fakat kod **4. bir `org_admin` rolü ve `/kurum` B2B paneli** içeriyor (yeni eklenmiş; `docs/b2b-refactor-plan.md` mevcut). Eski `/admin` muhasebe modülü **kaldırılmış** — middleware legacy `/admin`'i `/giris/koc`'a yönlendiriyor.

### Yetkilendirme — İki Katmanlı (Defense in Depth)

**Katman 1 — `proxy.ts` → `lib/supabase/middleware.ts`**
- Supabase SSR client ile cookie'den oturum yenilenir, `auth.getUser()`.
- Korumalı segment'ler `inSegment(prefix)` ile kontrol edilir (tam segment eşleşmesi — public `/kurumlar` ile `/kurum` paneli çakışmaz).
- Oturum yoksa → ilgili giriş sayfasına redirect.
- Oturum varsa → `profiles.role` okunur, `roleToPath` eşlemesiyle yanlış panele giren kullanıcı kendi paneline atılır.
- Giriş yapmış kullanıcı `/giris/*`'a girerse kendi paneline yönlendirilir.

**Katman 2 — Panel layout'ları**
Her panel layout'u (`app/{ogrenci,koc,mudur,kurum}/layout.tsx`) `getCurrentProfile()` ile rolü tekrar doğrular. `/kurum` ek olarak `organization_id` zorunluluğu kontrol eder. `getCurrentProfile()` React 19 `cache()` ile request başına tek DB sorgusuna iner.

### Login Akışı (adım adım)
1. Üç rol-spesifik giriş sayfası → `loginOgrenci/loginKoc/loginMudur` server action.
2. Ortak `loginWithRole(formData, expectedRole, redirectTo)`.
3. Zod doğrulama (email + min 6 karakter şifre).
4. `signInWithPassword`.
5. **Rol doğrulama**: `profiles.role` ≠ `expectedRole` → `signOut()` + "Bu hesap bu panele erişim yetkisine sahip değil." (öğrenci, koç sayfasından giremez.)
6. Başarıda kendi paneline redirect.

### Davet (Invite) Sistemi
- `lib/auth/invite.ts`: `inviteCoach`/`inviteStudent`. Önce `cleanupGhostUserIfAny` ile yarım kalmış orphan auth kayıtlarını temizler. Sonra `admin.auth.admin.inviteUserByEmail(email, { redirectTo: /auth/callback, data: { role, full_name, phone } })` — rol metadata'ya gömülür.
- Müdür koç daveti: `coach_source` (`internal`=KoçUp / `external`=Bağımsız) profile'a patch'lenir.
- Kurum daveti: davet sonrası profile'a `organization_id` set edilir (MVP yaklaşımı, metadata'ya geçilemediği için sonradan patch).
- **Yeniden davet** (`lib/auth/resend.ts`): caller yetkisi (`admin`/`org_admin`), hedefin hiç giriş yapmamış olması, 5 dk cooldown. `resetPasswordForEmail` kullanır ("already registered" hatasını atlamak için).
- `handle_new_user()` trigger: `auth.users` INSERT'te `raw_user_meta_data.role` doluysa `profiles` satırı oluşturur.

### Callback ve Şifre Akışı
- `/auth/callback` (route handler): PKCE (`code`), token_hash (`verifyOtp`), implicit (fragment → `/auth/callback/client`). Başarıda `/sifre-belirle`.
- `/sifre-belirle`: min 8 karakter, `updateUser({ password })`, role'e göre panele yönlendir.
- `/sifremi-unuttum`: email enumeration koruması (kayıtsız email'de bile success), 60 sn cooldown.

---

## 3. VERİTABANI ŞEMASI (SUPABASE)

Toplam **19 public tablo**, hepsinde RLS aktif. İki sistem tek DB'de: panel sistemi (`profiles` merkezli) + eski muhasebe (`students`/`packages`/`payments`).

### Tablolar

| Tablo | Amaç | Ana kolonlar |
|---|---|---|
| **profiles** | Tüm portal kullanıcıları (merkez) | `id`(=auth.users), `role`(student/coach/admin/org_admin), `full_name`, `email`, `phone`, `avatar_url`, `bio`, `organization_id`, `coach_source`, `last_invitation_sent_at`, `first_login_at`, `notification_preferences`(jsonb) |
| **students** | Portal öğrencileri (muhasebe `clients`'tan FARKLI) | `id`(=profiles), `coach_id`, `grade`, `target_university/department/ranking`, `parent_name/phone`, `kayit_kaynagi`, `school`, `is_active`, `organization_id` |
| **subjects** | Ders kataloğu (global) | `name`, `color`, `order`, `exam_type`(tyt/ayt/lgs), `curriculum`(normal/maarif), `grade` |
| **topics** | Konular | `subject_id`, `name`, `order` |
| **student_topics** | Öğrenciye atanmış konu durumu | `student_id`, `topic_id`/`custom_name`, `status`(basla/devam/tamam/tekrar), `solved_count`, `wrong_count`, `error_notes` |
| **study_sessions** | Günlük soru çözüm kaydı | `student_id`, `subject_id`, `date`, `total_questions`, `correct/wrong/empty`, `duration_minutes`, `assignment_id` |
| **topic_assignments** | Koçun hedefli konu ataması | `coach_id`, `student_id`, `topic_id`, `hedef_soru`, `hedef_sure_dk`, `son_tarih`, `status`(aktif/tamamlandi/iptal) |
| **exams** | Deneme sınavları | `student_id`, `name`, `exam_type`(tyt/ayt/tyt_ayt/lgs/okul), `date`, `siralama` |
| **exam_results** | Deneme ders sonuçları | `exam_id`, `subject_id`, `correct/wrong/empty`, `net`(generated stored = correct − wrong/4) |
| **schedule** | Haftalık ders programı | `student_id`, `term`(1/2), `day_of_week`(1-7), `start/end_time`, `subject_id`/`custom_title` |
| **appointments** | Randevular | `coach_id`, `student_id`?, `application_id`?, `type`, `status`, `start/end_time`, `is_recurring`, `recurrence_rule`, `parent_appointment_id`, `meeting_link` |
| **applications** | Başvuru formu | `full_name`, `email`, `phone`, `grade`, `segment`(lgs/yks), hedefler, `parent_*`, `status`, `rejection_reason`, `approved_student_id`, `tanitim_appointment_id` |
| **packages** | Abonelik paketleri | `student_id`, `name`, `monthly_price`, `start/end_date`, `payment_day`, `status`(active/paused/ended) |
| **payments** | Ödemeler | `package_id`, `student_id`, `amount`, `payment_date`, `period_month`, `method` |
| **blog_categories** | Blog kategorileri | `name`, `slug`, `description` |
| **blog_posts** | Blog yazıları | `slug`, `title`, `excerpt`, `content`, `cover_image_url`, `category_id`, `author_id`, `status`(draft/published/archived), `published_at`, meta_*, `view_count` |
| **organizations** | Kurum (B2B) | `name`, `slug`, `logo_url`, `primary_color`/`accent_color`, `plan`(starter/pro/enterprise), iletişim, `is_active` |
| **page_views** | Analitik (canlı-only, repoda migration YOK) | `event_type`, `path`, `tool_slug`, `referrer`, `session_id`, `is_authenticated` |
| **institution_inquiries** | Kurum demo talep formu (canlı-only) | `institution_name`, `full_name`, `phone`, `email`, `student_count`, `coach_count`, `message`, `status` |

### Önemli İlişkiler (FK)
- `profiles.id → auth.users` · `profiles.organization_id → organizations`
- `students.id → profiles` · `students.coach_id → profiles` · `students.organization_id → organizations`
- `topics.subject_id → subjects` · `student_topics → profiles/topics/subjects`
- `exams.student_id → profiles` · `exam_results.exam_id → exams`
- `appointments`: coach/student/created_by → profiles, `application_id → applications`, `parent_appointment_id → self`
- `packages/payments.student_id → students` (muhasebe tablosu)
- `blog_posts.author_id → profiles`, `category_id → blog_categories`

**Tasarım kararı (migration 110):** Tüm "oluşturan/onaylayan" FK'leri (`created_by`, `author_id`, `reviewed_by`) `ON DELETE SET NULL` + nullable — kullanıcı silindiğinde içerik korunur.

### RLS Politikaları
4 SECURITY DEFINER helper: `current_user_role()`, `is_coach_of(student_id)`, `is_org_admin_of(org_id)`, `current_user_org_id()` (+ canlıda `my_coach_id()`).

- **Standart desen** (student_topics, study_sessions, exams, schedule): SELECT/INSERT/UPDATE → `student_id = auth.uid() OR is_coach_of(student_id) OR admin`; DELETE → sadece koç/admin.
- **profiles**: kendi satırı + koç kendi öğrencilerini + öğrenci kendi koçunu + admin her şey + org_admin kendi kurumu.
- **applications / institution_inquiries**: herkes (anonim) INSERT, sadece admin yönetir.
- **blog**: public sadece `published`, admin tam.
- **organizations**: platform admin tam, org_admin kendi kurumu, üyeler branding okur.
- **page_views**: anon+auth INSERT, SELECT sadece admin/org_admin.

### Enum'lar
- Native ENUM: `blog_post_status`, `appointment_type`, `appointment_status`, `assignment_status`.
- CHECK constraint: `profiles.role`, `coach_source`, `subjects.exam_type/curriculum`, `exams.exam_type`, `student_topics.status`, `applications.grade/status/segment`, `packages.status`, `organizations.plan`.

> ⚠️ **Repo ≠ canlı**: `supabase/migrations/` (37 dosya) canlı DB (40 migration) ile **tam senkron değil**. `page_views`, `institution_inquiries`, `maarif` müfredatı, analitik RPC'ler ve genişletilmiş CHECK'ler yalnızca canlıda. Tanıtımda canlı şema esastır.

---

## 4. ÖZELLİKLER (FEATURE BAZINDA)

### 4.1 LGS / YKS Segmentasyonu
- `lib/exam-target.ts`: `gradeToExamTypes()` (7-8 → LGS, diğerleri → TYT/AYT), `gradeIsLgs()`, `examTypeLabel()`.
- Başvuru formunda segment açık seçilir (LGS=5-8, YKS=9-12/Mezun), sunucu `superRefine` ile sınıf-segment uyumunu doğrular.
- Müfredatta iki eksen: `subjects.curriculum` (normal/maarif) + grade/exam_type türevli seviye.
- ⚠️ Tutarsızlık: Müdür müfredat CRUD `exam_type`'ı büyük harf (`TYT`/`AYT`) yazıyor, koç atama dialog'u küçük harf filtreliyor → müdürün eklediği ders koç seçicisinde görünmeyebilir.

### 4.2 Koç Davet Sistemi
Bkz. bölüm 2. Davet/yeniden davet/orphan temizleme/cooldown ile olgun bir akış. Koç silme `delete_coach_safely` RPC (atomik).

### 4.3 Randevu / Appointment Paneli
- Tek `appointments` tablosu, **tekrarlayan randevu var** (`lib/appointments/recurrence.ts` — weekly/biweekly, parent + child satırlar).
- Çakışma kontrolü (`findConflict`) + "Yine de Oluştur" force.
- Düzenle/sil `scope: one|series`.
- Roller: Koç (tam CRUD), Müdür (read-only tüm sistem), Öğrenci (read-only kendi).
- Görünümler: hafta grid (08:00-22:00), ay (42 hücre), liste.
- Tanıtım randevusu ayrı akış (başvurudan, `student_id=null`, `application_id` bağlı).

### 4.4 Konu / Topic İlerleme Takibi
- Müfredat: `subjects` + `topics` (`lib/curriculum/topics.ts`).
- **İki atama tablosu**: `student_topics` (durum + sayaçlar, üzerine yazılır) ve `topic_assignments` (hedefli: hedef_soru, son_tarih, status).
- Koç: tekli + toplu atama (`bulkAssign`), custom konu ekleme.
- İlerleme `study_sessions`'a loglanır.
- Müdür müfredat CRUD (`/mudur/mufredat`).
- ⚠️ `koc/konu-analizi/page.tsx` stub redirect olmuş (per-student tab modeline geçiş).

### 4.5 Başvuru Formu ve Segmentasyonu
- `app/(public)/basvuru/`: LGS/YKS toggle ile dinamik alanlar. Zod + superRefine → `applications` tablosu. Tekrar email engeli.
- Müdür inceleme yaşam döngüsü: `pending → tanitim_planlandi → tanitim_tamamlandi → approved/rejected`.
- Onay: `inviteStudent` davet + `students` insert + opsiyonel koç ataması. Red: min 10 karakter sebep.

### 4.6 B2B Kurumlar Sayfası + Kurum Paneli
- `/kurumlar`: pazarlama landing + demo formu (`demo-form.tsx` → `institution_inquiries` tablosu).
- Tam **kurum (org_admin) paneli** (`/kurum`): dashboard (koç/öğrenci/soru istatistikleri), koç yönetimi (davet/çıkar/yeniden davet), analitik, **white-label marka ayarları** (logo + `primary_color`/`accent_color` CSS değişkenlerine enjekte).
- ⚠️ Landing vitrin bölümünde placeholder (`[buraya gerçek rakam...]`).

### 4.7 Blog CMS (SEO)
- `blog_categories` + `blog_posts` (markdown content, status, SEO meta, view_count).
- Editör: `@uiw/react-md-editor` (live preview). Render: react-markdown + remark-gfm + rehype-sanitize (XSS).
- SEO: tam `generateMetadata` (canonical, OG article, Twitter) + JSON-LD (BlogPosting + BreadcrumbList).
- TOC, okuma süresi, Türkçe slug + benzersizlik. Public sayfalar ISR (revalidate 3600).
- View sayacı RPC `increment_blog_post_view`.

### 4.8 Pomodoro Timer
- Zustand + persist (`lib/pomodoro/store.ts`). Timestamp tabanlı drift-free, Web Audio chime, Web Notification.
- Öğrenci + koç sidebar widget'ı, mobil floating pill, public araç sayfası.

### 4.9 Analytics Dashboard (Ziyaretler)
- Tracking: `page-view-tracker` → `lib/analytics/track.ts` (sendBeacon) → `/api/track` → `page_views` tablosu.
- Müdür dashboard (`/mudur/ziyaretler`): 7 RPC paralel (`admin_pv_kpis/daily/top_pages/top_blog/tool_breakdown/source_breakdown/funnel`).
- KPI kartları (% değişim), günlük grafiği, kaynak donut (Direkt/Organik/Sosyal/Diğer), funnel (oturum→araç/blog→başvuru), top sayfalar/blog, araç kullanımı. Tarih aralığı `?range=1|7|30|90`.
- ⚠️ UTM parametresi yok. RPC'ler ve tablo için repoda migration yok (sadece canlı DB + types).

### 4.10 Google Ads / GA4
- `app/layout.tsx`: gtag.js `AW-18185085898` (Google **Ads**, hardcoded). **GA4 (G-XXXX) ve GTM YOK** — sadece Ads property.
- Conversion: başvuru başarısında `gtag("event","conversion", {value:1.0, currency:"TRY"})` + `generate_lead`. Env set edilmezse hardcoded conversion label fallback.

### 4.11 Ücretsiz Araçlar (`/araclar`)
- **Net Hesaplama**: TYT/AYT/LGS, AYT alan seçimi, net = doğru − yanlış/bölen.
- **Geri Sayım**: YKS/LGS sınav sayacı. ⚠️ Tüm tarihler `confirmed:false` (tahmini), 2026 tarihleri geçmiş.
- **Tercih Rehberi**: statik içerik + YÖK Atlas dış linki.
- **Pomodoro**: bkz. 4.8.
- Her araç JSON-LD (WebApplication) + kullanım izleme (`trackToolUse`).

### 4.12 Diğer Özellikler
- **Deneme takibi**: `exams` + `exam_results`, trend/radar/karşılaştırma grafikleri.
- **Haftalık program**: `schedule`, weekly grid, dönem switch, overlap kontrolü.
- **Soru çözüm**: `study_sessions`, takip dashboard (haftalık özet, gecikmiş atamalar, 8 haftalık trend).
- **Ödeme/Paket**: aylık abonelik (taksit yok), müdür finans dashboard. ⚠️ `getPaymentStatus` kullanılmıyor.
- **Bildirimler**: ⚠️ GERÇEK DEĞİL — `notification_preferences` UI hazır ama backend yok, email altyapısı yok (sadece Supabase auth mailleri).
- **Rapor/Export**: ⚠️ YOK — CSV/PDF/Excel indirme yok, sadece ekran içi grafikler.

---

## 5. SAYFA HARİTASI (ROUTING)

### Public (`(public)` grubu)
| URL | İşlev |
|---|---|
| `/` | Ana sayfa |
| `/kurumlar` | B2B tanıtım + demo formu |
| `/basvuru` | Öğrenci başvuru formu (LGS/YKS) |
| `/blog`, `/blog/[slug]`, `/blog/kategori/[slug]` | Blog (dinamik) |
| `/araclar` + `/geri-sayim` `/net-hesaplama` `/pomodoro` `/tercih-rehberi` | Ücretsiz araçlar |
| `/giris/ogrenci` `/giris/koc` `/giris/mudur` | Rol bazlı giriş |
| `/sifre-belirle`, `/sifremi-unuttum` | Şifre akışları |

### Auth / API
| URL | İşlev |
|---|---|
| `/auth/callback` (route.ts) + `/auth/callback/client` | Davet/recovery callback |
| `/api/track` (POST) | Anonim analytics |

### /ogrenci (student)
`/` dashboard · `/konularim` · `/program` · `/randevularim` · `/denemelerim` (+`/yeni`, `/[id]`) · `/analizim` · `/soru-cozum` (+`/yeni`) · `/kocum` · `/profilim` · `/ayarlar`

### /koc (coach)
`/` dashboard · `/ogrenciler` (+`/yeni`, `/[id]` + alt sekmeler: `duzenle`, `konular`, `konu-analizi`, `denemeler`, `program`, `soru-cozum`, `takip`, `odemeler`) · `/randevular` · `/denemeler`* · `/konu-analizi`* · `/takip`* · `/payments` · `/packages` · `/araclar` · `/profilim` · `/ayarlar`  
(*stub redirect → `/koc/ogrenciler`)

### /mudur (admin)
`/` dashboard · `/basvurular` (pending badge) · `/koclar` (+`/[id]`) · `/ogrenciler` (+`/[id]` + alt sekmeler) · `/konu-analizi` · `/denemeler` · `/randevular` · `/finans` · `/mufredat` · `/blog` (+`/yeni`, `/[id]/duzenle`, `/kategoriler`) · `/ziyaretler` · `/profilim` · `/ayarlar`

### /kurum (org_admin)
`/` dashboard · `/koclar` (+`/[id]`) · `/ogrenciler` · `/analitik` · `/ayarlar`

---

## 6. KURUMSAL (B2B) AÇIDAN ÖNEMLİ NOKTALAR

### Bir dershane neyden faydalanır?
- **Hazır kurum paneli** (`/kurum`): koç ve öğrenci yönetimi, davet/çıkarma, kurum çapında analitik.
- **White-label**: kurum logosu + marka renkleri (primary/accent) panele enjekte ediliyor — dershanenin kendi markasıyla görünür.
- **Koç-öğrenci koçluk akışı tam**: konu atama (hedefli + durum), haftalık program, deneme/soru çözüm takibi, performans grafikleri.
- **Randevu sistemi** (tekrarlayan dahil), veli görüşmesi tipi.
- **Başvuru → tanıtım randevusu → onay → öğrenci** hunisi (lead yönetimi).
- **Pazarlama tarafı**: SEO blog CMS, ücretsiz araçlar (lead toplama), Google Ads conversion, ziyaret analitiği.

### Çoklu kurum / multi-tenancy
- `organizations` tablosu + `profiles.organization_id` / `students.organization_id` ile veri izolasyonu.
- RLS: `is_org_admin_of()` / `current_user_org_id()` helper'ları ile org_admin sadece kendi kurumunu görür.
- Kurum daveti koçu doğrudan `organization_id`'ye bağlar.

### 300 öğrenci için mevcut altyapı durumu
- ✅ Veri modeli ve RLS multi-tenant'a hazır.
- ⚠️ **Toplu öğrenci ekleme YOK** — öğrenciler tek tek davet/başvuru ile ekleniyor. 300 öğrenci için CSV/Excel toplu import gerekir.
- ⚠️ **Liste sayfalarında pagination/arama görünmüyor** — 300+ kayıtta performans/kullanılabilirlik sorunu olabilir.
- ⚠️ Email altyapısı yalnızca Supabase auth maillerine dayalı; 300 davette rate-limit/teslimat planlanmalı.

### B2B için gerekebilecek eksik özellikler
1. Toplu öğrenci/koç import (CSV/Excel).
2. Liste sayfalarında pagination + arama + filtreleme.
3. Rapor export (PDF/Excel) — veli/yönetim raporları.
4. Gerçek bildirim sistemi (email/SMS/in-app) — backend yok.
5. Kurum bazlı faturalama/abonelik yönetimi (plan alanı var ama akış yok).
6. Veli paneli/erişimi (şu an veli sadece data alanı).
7. Kurum yöneticisi için detaylı izin/rol kırılımı.

---

## 7. MEVCUT DURUM VE BİLİNEN EKSİKLER

### Yarım / Placeholder / TODO
- `/kurumlar` vitrin rakamları placeholder (`[buraya gerçek rakam...]`).
- Geri sayım araç tarihleri tümü `confirmed:false`, 2026 tarihleri geçmiş.
- `getPaymentStatus` (`lib/payments.ts`) tanımlı ama kullanılmıyor.
- Google Ads conversion env (`NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID`) set edilmemiş, hardcoded fallback kullanılıyor (TODO işaretli).
- 3 koç sayfası stub redirect: `koc/denemeler`, `koc/takip`, `koc/konu-analizi`.

### Bilinen Bug / Geçici Çözümler
- **exam_type büyük/küçük harf uyumsuzluğu**: müdür `TYT/AYT`, koç `tyt/ayt` → ders koç seçicisinde görünmeyebilir.
- **CLAUDE.md ihlalleri**: Pomodoro `localStorage`, blog view sayacı `sessionStorage` kullanıyor (kural ikisini de yasaklıyor).
- **Versiyonlanmamış şema**: `page_views`, `institution_inquiries`, `maarif` müfredatı, `admin_pv_*` RPC'leri için repoda migration YOK — sadece canlı DB. Disaster recovery / yeni ortam kurulumu riski.
- **Gizli DB bağımlılıkları**: `exam_results.net` generated column, analytics RPC gövdeleri uygulama kodunda görünmüyor.
- **İki uzlaşmayan model**: `student_topics` (üzerine yazılan sayaç) vs `study_sessions` (append-only) birbiriyle senkron değil.
- **org_admin login**: ayrı giriş sayfası yok, `/giris/koc` paylaşımlı; rol uyuşmazlığı edge-case'leri var.

### Performans / Ölçeklenebilirlik (300+ öğrenci)
- Liste sayfalarında pagination/arama görünmüyor — büyük veri setinde yavaşlama.
- Toplu import yok — manuel ekleme 300 öğrenci için elverişsiz.
- Email davet rate-limit (Supabase) toplu davette darboğaz olabilir.
- RLS helper'ları SECURITY DEFINER — yoğun sorguda indeksleme gözden geçirilmeli.
- ISR/analytics altyapısı public tarafta makul; asıl risk panel liste sorgularının sayfalanmaması.

### Genel Değerlendirme
Sistem **4 panelli** (öğrenci/koç/müdür/kurum), B2B multi-tenant temelli, blog+SEO, analytics, ücretsiz araçlar ve Google Ads conversion ile pazarlama tarafı dahil **oldukça kapsamlı ve modern bir stack** üzerine kurulu. Çekirdek koçluk akışı (konu atama, program, deneme/soru takibi, randevu, başvuru hunisi) çalışır durumda. B2B'ye ölçeklemek için ana yatırım alanları: **toplu import, pagination/arama, rapor export, gerçek bildirim sistemi ve migration disiplininin (repo↔canlı senkronu) düzeltilmesi.**
