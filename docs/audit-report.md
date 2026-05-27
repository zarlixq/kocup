# KoçUp — Audit Raporu

> Tarih: 2026-05-25  
> Kapsam: app/, lib/, components/, supabase/migrations  
> Hazırlayan: Claude (Opus 4.7)

Bu rapor, talep edilen 5 öncelik (2 kritik bug + performans + B2B uygunluk + LGS desteği + genel audit) doğrultusunda tüm projeyi taradıktan sonra çıkardığım bulguları içerir. Her bulgu için **kök neden** ve **önerilen düzeltme** belirtilmiştir. B2B refactor'ı için ayrı bir plan `docs/b2b-refactor-plan.md` dosyasındadır.

---

## 🔴 KRİTİK BULGULAR (HEMEN DÜZELTİLMELİ)

### KB-1 — Davet emaillerinde `localhost:3000` linki (Bug 2)

**Dosya:** `lib/auth/invite.ts:19,43`

```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
```

**Kök neden:**
1. `.env.local` dosyasında `NEXT_PUBLIC_SITE_URL` **tanımlı değil** (sadece `.env.local.example`'de var: `https://www.kocupakedemi.com`).
2. Yalnızca bu dosyada fallback `localhost:3000` (proje genelinde diğer 9 dosya `https://www.kocupakedemi.com` fallback'i kullanıyor).
3. Sonuç: `redirectTo` parametresi `http://localhost:3000/auth/callback` olarak gönderiliyor → davet mailindeki tıklama "siteye bağlanılamadı" hatası veriyor.

**Ayrıca dikkat:** Supabase Auth, davet email'indeki `{{ .ConfirmationURL }}` değişkenini **Supabase Dashboard → Authentication → URL Configuration → Site URL** ayarına göre üretir. Yani sadece env düzeltmesi yetmez; **Supabase Dashboard'da Site URL ve Redirect URLs allowlist** de production'a göre güncellenmeli.

**Düzeltme:**
1. `.env.local` ve Vercel/Production'a `NEXT_PUBLIC_SITE_URL=https://www.kocupakedemi.com` ekle.
2. `lib/auth/invite.ts` fallback'ini `https://www.kocupakedemi.com` yap (localhost asla production'a sızmasın).
3. Supabase Dashboard:
   - Authentication → URL Configuration → **Site URL** = `https://www.kocupakedemi.com`
   - **Redirect URLs** allowlist'ine `https://www.kocupakedemi.com/auth/callback` ve `https://www.kocupakedemi.com/auth/callback/client` ekle.
4. Tek noktadan URL üretmek için `lib/site-url.ts` helper'ı oluştur:
   ```ts
   export function getSiteUrl() {
     return (
       process.env.NEXT_PUBLIC_SITE_URL ??
       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.kocupakedemi.com")
     ).replace(/\/$/, "")
   }
   ```
   Tüm `?? "..."` fallback'lerini bu helper ile değiştir.

---

### KB-2 — Hayalet koç kaydı / "already exists" hatası (Bug 1)

**Dosyalar:** `app/mudur/koclar/actions.ts:130-157` + `lib/auth/invite.ts`

**Kök nedenler (çoklu):**

1. **FK constraint'ler `deleteUser`'ı bloke ediyor:** Aşağıdaki tablolarda koça referans veren FK'lerin `ON DELETE` davranışı belirsiz (default `NO ACTION`):
   - `applications.reviewed_by` → `auth.users(id)` — bir başvuru reviewlamış koç silinemez
   - `applications.approved_student_id` → `auth.users(id)`
   - `study_sessions.created_by` → `profiles(id)`
   - `exams.created_by` → `profiles(id)`
   - `topic_assignments.created_by` → `profiles(id)`
   - `appointments.created_by` → `profiles(id)`
   - `blog_posts.author_id` → `profiles(id)` `ON DELETE RESTRICT` (en sert)
   
   Sonuç: `auth.admin.deleteUser(id)` çağrısı PostgreSQL FK violation hatasıyla başarısız oluyor. Ama UI bunu generic "Silinemedi, tekrar deneyin." olarak gösteriyor; kullanıcı detayı görmüyor.

2. **Davet öncesi hayalet-kayıt kontrolü yok:** `inviteCoach`/`inviteStudent` direkt `auth.admin.inviteUserByEmail` çağırıyor. Eğer:
   - Önceki silme yarım kaldıysa (FK bloklaması yüzünden), `auth.users`'ta kayıt vardır → Supabase "User already registered" döner.
   - Veya kullanıcı dashboard'tan elle `profiles` satırını sildi ama `auth.users` kaldı.
   
   Şu an UI bunun için net mesaj göstermiyor.

3. **Soft delete riski (Supabase varsayılanı):** `deleteUser` çağrısı `shouldSoftDelete: false` ile çağrılıyor (varsayılan) — bu OK. Ama Supabase Auth ayarlarında "Allow soft delete" enabled ise hard delete olmayabilir. Dashboard kontrol gerekli.

4. **`coaches` (muhasebe tablosu) ile çakışma yok:** Migration 060 muhasebe tablolarını sildiği için bu artık tetiklemiyor. Kontrol edildi.

**Düzeltme planı:**

1. **FK'leri düzelt** (yeni migration):
   ```sql
   -- applications: koç review FK'larını SET NULL'a çevir
   alter table public.applications
     drop constraint applications_reviewed_by_fkey,
     add constraint applications_reviewed_by_fkey
       foreign key (reviewed_by) references auth.users(id) on delete set null;
   
   alter table public.applications
     drop constraint applications_approved_student_id_fkey,
     add constraint applications_approved_student_id_fkey
       foreign key (approved_student_id) references auth.users(id) on delete set null;
   
   -- exams.created_by, study_sessions.created_by, topic_assignments.created_by,
   -- appointments.created_by → SET NULL (created_by nullable yap)
   alter table public.exams alter column created_by drop not null;
   alter table public.exams
     drop constraint exams_created_by_fkey,
     add constraint exams_created_by_fkey
       foreign key (created_by) references public.profiles(id) on delete set null;
   -- (study_sessions, topic_assignments, appointments için aynı kalıp)
   
   -- blog_posts.author_id RESTRICT → SET NULL (yazar silinince yazı kalsın, anonim olsun)
   alter table public.blog_posts
     drop constraint blog_posts_author_id_fkey,
     add constraint blog_posts_author_id_fkey
       foreign key (author_id) references public.profiles(id) on delete set null;
   alter table public.blog_posts alter column author_id drop not null;
   ```

2. **`deleteCoach` server action'ı atomik bir SECURITY DEFINER function'a sar** (`public.delete_coach_cascade(coach_uuid uuid)`):
   - Önce koça atanmış öğrenci sayısı > 0 ise hata
   - Önce review edilmiş başvurularda `reviewed_by` null'a çek
   - Önce yazılmış blog post'larda `author_id` null'a çek
   - Sonra `auth.users` sil (cascade profiles)

3. **Davet öncesi hayalet kayıt kontrolü** ekle (`lib/auth/invite.ts`):
   ```ts
   // Önce kayıt var mı kontrol et
   const { data: existing } = await admin.auth.admin.listUsers()
   const ghost = existing.users.find(u => u.email === email && !u.email_confirmed_at && !u.last_sign_in_at)
   if (ghost) {
     // Henüz davet kabul etmemiş hayalet kayıt → otomatik temizle
     await admin.auth.admin.deleteUser(ghost.id)
   }
   ```
   
4. **UI'a anlamlı hata mesajı** geçir: silme başarısız olursa "bu koç X öğrenciye atanmış / Y blog yazısı yazmış" gibi spesifik mesaj.

---

### KB-3 — `deleteStudentAction` ve `toggleStudentActiveAction` güvenlik açığı (KRİTİK)

**Dosya:** `app/koc/ogrenciler/actions.ts:129-147`

```ts
export async function toggleStudentActiveAction(id: string, nextValue: boolean) {
  const supabase = await createClient()                                    // ← user check YOK
  const { error } = await supabase.from("students").update(...).eq("id", id)
  // ...
}

export async function deleteStudentAction(id: string) {
  // Auth user'ı sil → cascade ile profiles + students + bağımlı veriler silinir
  const admin = supabaseAdmin()                                            // ← service role!
  const { error } = await admin.auth.admin.deleteUser(id)                  // ← AUTH/OWNERSHIP YOK
  // ...
}
```

**Risk:** Bu server action `'use server'` direktifiyle Next.js'te çağrılabilir. Hiçbir auth/ownership kontrolü yok. Sistemde **herhangi bir kullanıcı** (öğrenci dahil), action endpoint'ini bilirse ve bir UUID gönderirse, **istediği kullanıcıyı silebilir** (admin koç dahil).

**Düzeltme:**
```ts
export async function deleteStudentAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Yetkisiz işlem." }
  
  // Ownership: bu öğrenci bu koça mı atanmış?
  const { data: student } = await supabase
    .from("students")
    .select("coach_id")
    .eq("id", id)
    .maybeSingle()
  if (!student || student.coach_id !== user.id) {
    return { error: "Yetkisiz işlem." }
  }
  
  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.deleteUser(id)
  // ...
}
```

Aynısı `toggleStudentActiveAction`, `updateStudentAction` için de gerekli.

---

### KB-4 — Service role API'leri exposure riski yok ama kontrol edildi

**İncelendi:** `lib/supabase/admin.ts:5-7` — runtime'da `typeof window !== "undefined"` ile guard var. Tüm `supabaseAdmin()` çağrıları `"use server"` dosyalarında. Geçici risk yok.

**`SUPABASE_SERVICE_ROLE_KEY`** `.env.local`'de var; `.env.local` `.gitignore`'da olmalı. Kontrol edildi: var.

**Uyarı:** Bu konuşmada `.env.local` içeriği bana okutuldu, yani service role key + anon key bu transcript'te yer alıyor. Eğer transcript paylaşılır/loglanırsa **key rotation** önerilir (Supabase Dashboard → Settings → API → rotate `service_role` key).

---

## 🟠 PERFORMANS BULGULARI

### P-1 — Her sayfa için minimum 3 session/profile lookup

**Dosyalar:**
- `lib/supabase/middleware.ts:55-60` — middleware'de profile lookup
- `app/koc/layout.tsx:7-18`, `app/mudur/layout.tsx:7-18`, `app/ogrenci/layout.tsx:7-18` — her layout'ta tekrar
- Sayfa içlerinde tekrar `auth.getUser()` çağrıları

**Etki:** Her sayfa yüklemede ekstra **2-3 ms × N round-trip** Supabase'e gidiyor. Mobile/uzak network'te bu dakikada görülen yavaşlığın büyük kısmı.

**Düzeltme:**
1. Middleware'de profile'ı session'a embed et (JWT custom claim) veya cookie'de cache'le.
2. Layout'larda profile lookup'ı `cache()` ile sarmala (React 19 `cache()` aynı request içinde tekrar etmez):
   ```ts
   import { cache } from "react"
   export const getCurrentProfile = cache(async () => { ... })
   ```
3. Daha radikal: Supabase'in `app_metadata` kısmına `role` set et (Davet sırasında) ve middleware'de **DB'ye gitmeden** rolü oku.

---

### P-2 — `loading.tsx` HİÇBİR route'ta yok

**Bulgu:** 50+ sayfa var, **0 loading.tsx**. Navigation sırasında kullanıcı boş ekrana bakıyor.

**Düzeltme:** Her route segmentinin başına bir `loading.tsx` ekle (skeleton). Öncelik:
- `app/koc/loading.tsx`
- `app/mudur/loading.tsx`
- `app/ogrenci/loading.tsx`
- `app/koc/ogrenciler/loading.tsx`, `app/koc/ogrenciler/[id]/loading.tsx`
- `app/mudur/basvurular/loading.tsx`, `app/mudur/koclar/loading.tsx`
- `app/mudur/finans/loading.tsx`

Her biri ~30 satır skeleton card'lar. Algılanan yükleme süresinde **dramatik** iyileşme.

---

### P-3 — Müdür Dashboard'unda 11 paralel query + `students` full-scan

**Dosya:** `app/mudur/page.tsx:70-104`

11 paralel query var (iyi: paralel). Ama:
- `supabase.from("students").select("created_at, is_active")` — **tüm öğrencileri çekiyor** (kümülatif chart için). Şu an küçük scale'de problem değil ama 1000+ öğrenci olunca büyük yük.
- `study_sessions.select("date, total_questions")` 30 günlük tüm sistem soru çözümlerini çekiyor — büyüdükçe MB'lar.

**Düzeltme:**
1. Aktif öğrenci kümülatif çizgisini DB'de hesapla (Postgres `date_trunc` + `cumulative count` window function); 6 satır döner.
2. System questions trend için `date_trunc('day', date)` + `sum(total_questions)` aggregation; 30 satır döner.
3. Materialized view veya `pg_cron` ile günde bir refresh.

---

### P-4 — N+1 benzeri problem: koç dashboard payment+package nested join

**Dosya:** `app/koc/page.tsx:32-37`

```ts
supabase
  .from("students")
  .select("id, is_active, packages(...), payments(amount, period_month)")
  .eq("coach_id", user!.id)
```

Problem: `payments` filtrelenmeden çekiliyor (period_month'a göre); sonra JS'te filter. 1 koç × 30 öğrenci × 12 ay = 360 payment satırı. Bunun yerine:

```ts
supabase.from("students")
  .select("id, is_active, packages(...), payments!inner(amount, period_month)")
  .eq("coach_id", user!.id)
  .eq("payments.period_month", currentPeriodMonthISO())
```

Veya iki ayrı query: students + packages, sonra payments (sadece bu ay).

---

### P-5 — Index önerileri

**Eksik index'ler:**
- `study_sessions.created_by` (koç oluşturduğu session'lar listeleniyor mu?)
- `exams.created_by`
- `topic_assignments.created_by`
- `appointments(coach_id, status, start_time)` composite (filtreler bu üçü birlikte)
- `applications.reviewed_by` (koç ile filtre yapan query var mı kontrol)
- `students(coach_id, is_active)` composite (zaten `is_active` ve `coach_id` ayrı var; composite daha hızlı)

---

### P-6 — Bundle / dynamic import

Build çıktısı görülmedi (rapor için `next build` çalıştırılmadı). Tahmini büyük bundle nedenleri:
- `recharts` — her dashboard'da import. Dynamic import edilebilir (`next/dynamic` + `ssr: false`).
- `@uiw/react-md-editor` — sadece blog yeni/düzenle'de kullanılıyor; client-only zaten ama dynamic import şart (markdown editor 200KB+).
- `react-markdown` + `rehype-*` + `remark-gfm` — blog detay sayfasında dynamic.

---

### P-7 — `<Link prefetch>` davranışı

Next.js 16 default `prefetch={true}`. Hover'da prefetch tetikleniyor. Bu **doğru kullanım**, ama sidebar'da 10+ link varsa initial render'da hepsini prefetch ediyor (önemsiz route'lar dahil). Kontrol önerilir; gerek yoksa `prefetch={false}` koy.

---

### P-8 — Connection pooling kontrolü

`NEXT_PUBLIC_SUPABASE_URL` direct connection. Production'da **Supabase Pooler URL** (`?pgbouncer=true`) kullanılmalı. Supabase'in Next.js SSR client'ı zaten anon key + REST API üzerinden gidiyor, direkt postgres connection değil — yani bu maddenin etkisi sınırlı; ama edge function/server action'da yoğun yük olursa pooler önemli.

---

## 🟡 GÜVENLİK (RLS, AUTH)

### S-1 — RLS aktif tüm tablolarda ✅
Migration'ları taradım: `profiles`, `applications`, `students`, `student_topics`, `study_sessions`, `exams`, `exam_results`, `schedule`, `subjects`, `topics`, `topic_assignments`, `appointments`, `packages`, `payments`, `blog_categories`, `blog_posts` — hepsinde `enable row level security` var.

### S-2 — `subjects_read_all: for select using (true)` ✅
Subjects herkesin okuyabildiği bir global tablo, beklenen davranış.

### S-3 — `blog_posts_public_read: status = 'published'` ✅
Public blog'a uygun policy.

### S-4 — `applications_insert_public: with check (true)` ⚠️
Public form bu policy olmadan çalışmazdı. Ama **rate limit yok** — bir bot saniyede yüzlerce başvuru gönderebilir. Düzeltme: 
- IP/email başına rate limit (Vercel WAF veya bir lightweight middleware)
- veya hCaptcha/reCAPTCHA başvuru formunda

### S-5 — Service role kullanan server action'larda auth check eksiklikleri
`KB-3` ile aynı: `app/koc/ogrenciler/actions.ts` — `delete/toggle/update`'te user/ownership kontrolü yok. Service role bypass ediyor. Tüm `supabaseAdmin()` kullanan action'larda 2 aşamalı kontrol:
1. `auth.getUser()` ile user var mı?
2. Bu user'ın target kayda yetkisi var mı? (RLS sorgusuyla **anon client** üzerinden okuyarak kontrol et — sonra admin client ile yaz.)

### S-6 — `applications` tablosu `email` üzerinden unique constraint var (migration `040 index on email`) ama unique değil
Aynı email ile birden fazla başvuru olabilir. `actions.ts:52` `error.code === "23505"` kontrolüne göre unique olmalı — ama migration'da sadece **index** var, **unique constraint** yok. `submitBasvuru` koddaki kontrol yanıltıcı. Düzeltme: ya constraint ekle, ya da kontrolü application-level yap.

---

## 🟢 HATA YÖNETİMİ

### E-1 — `app/error.tsx` var ama route segment'lerinde yok
Sadece root'ta `app/error.tsx`. Müdür/koç/öğrenci panelleri için ayrı error.tsx önerilir (kullanıcıya panele uygun mesaj + dashboard'a dönme linki).

### E-2 — Server action error mesajları generic
`catch (err) { return { success: false, error: "Bir hata oluştu, tekrar deneyin." } }` her yerde. Geliştirme aşamasında log ile sebep görülüyor ama production'da kullanıcı net mesaj alamıyor. Önerim: known error code'ları (FK violation, unique violation) Türkçe açıklamalı mesajlara map'le.

### E-3 — `try/catch`'siz async fonksiyon
Aramayla bulduklarım çoğunlukla server action'larda `try/catch` var. Ancak `app/koc/page.tsx` gibi RSC'lerde direkt `await` var, hata fırlatırsa `app/error.tsx`'e düşüyor — bu beklenen davranış. Critical değil.

### E-4 — `console.error` server-side'da production'da kaybediliyor
Sentry/Logflare/Axiom gibi bir error tracker önerilir. Şu an logger yok.

---

## 🔵 TİP GÜVENLİĞİ

### T-1 — `any` kullanımı
Grep ile `: any` araması: sadece `app/(public)/basvuru/page.tsx:13` — `window.gtag?: (...args: any[]) => void` (3rd party API tipi). Bu kabul edilebilir. **Proje genelinde `any` kullanımı çok düşük**, iyi durumda.

### T-2 — `database.types.ts` ne kadar güncel?
Migration listesi son 098'e kadar gidiyor. `lib/database.types.ts` boyutu görülmedi; en son ne zaman generate edildi belli değil. Manuel veya `supabase gen types typescript --linked > lib/database.types.ts` ile her migration sonrası yenilenmeli.

### T-3 — Server action input'larda Zod ✅
Çoğu action'da `safeParse` var. İyi durumda. Tek istisna: `koc/ogrenciler/actions.ts:deleteStudentAction` — sadece UUID alıyor ama validation yok. Zod ile UUID validate edilebilir.

---

## 🟣 GENEL KOD KALİTESİ

### G-1 — Dead code
- `blocks/` klasörü — ne için? Görünüşe göre landing page bileşenleri. `app/(public)/page.tsx` ile bağlantısı kontrol edilmeli.
- Eski `coaches` (muhasebe) trigger'ı migration 060'ta drop edildi ama `handle_new_coach` referansı kaldıysa bak.

### G-2 — Tarih formatı tutarsızlığı
- `lib/format.ts` var (kontrol edilmedi içeriği) ama `app/mudur/page.tsx:48-54` kendi `formatDate` fonksiyonunu yazıyor. CLAUDE.md `DD.MM.YYYY` istiyor. `app/mudur/page.tsx`'deki `toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })` `25.05.2026` döner — uyumlu. Ama tek noktadan `lib/format.ts` kullanılmalı.

### G-3 — `kocupakedemi.com` typo?
`https://www.kocupakedemi.com` — "kocupakedemi" doğru mu yoksa "kocupakademi" mi olmalı? **Bu kontrol edilmeli** (domain whois). Eğer typo'ysa, üretimde her şey kırılmış demektir.

### G-4 — Onboarding metadata'sında `LGS` özelliği koç profillerinde var
`migrations/073_seed_4_coach_profiles.sql:67-69` — Ferah Tahtabaşı'nın specialty'sinde 'LGS' var. Yani sistemde LGS koçluğu zaten varsayılıyor. LGS desteği önemli.

---

## 🩹 ACCESSIBILITY (a11y)

Hızlı bir tarama:
- `app/(public)/basvuru/page.tsx` — form input'larda `<Label htmlFor>` var ✅
- `app/(public)/sifre-belirle/form.tsx` — aynı ✅
- `components/ui/*` — shadcn standardı, a11y iyi

**İyileştirme önerileri:**
- Sidebar mobil sheet'te `aria-label` kontrol edilmeli
- Tablo'larda `<caption>` veya `aria-label` yok
- Toast (sonner) `role="status"` veya `role="alert"` set ediyor mu kontrol (sonner default doğru yapar)

Genel olarak a11y orta-iyi seviyede, kritik açık yok.

---

## 📚 LGS DESTEĞİ — MEVCUT DURUM ANALİZİ

**Yapılmış olanlar:**
- Migration 071: `applications.grade` constraint'i `'7'`, `'8'` eklenmiş ✅
- Migration 097: `exams.exam_type` `'lgs'` ve `'okul'` eklenmiş, `siralama` + `notes` kolonları eklenmiş ✅
- Migration 098: LGS müfredat seed'i var — 6 ders × 54 konu ✅
- `app/(public)/basvuru/page.tsx:95-96` — Form'da "7. Sınıf" ve "8. Sınıf (LGS)" seçenekleri ✅
- `app/(public)/basvuru/actions.ts:10` — Zod enum 7,8 dahil ✅

**Eksik olanlar:**
1. **`students.exam_target` kolonu yok.** Şu an LGS mi YKS mi olduğu sadece `grade`'den çıkarsanabilir. Bu UI'da kafa karışıklığına yol açar.
2. **`koc/ogrenciler/actions.ts:19` ve `mudur/ogrenciler/actions.ts:50`** — `grade` enum'ı hâlâ sadece `["9","10","11","12","Mezun"]`. Koç paneli üzerinden 7-8 öğrenci eklenemiyor.
3. **UI'da konu filtrelemesi:** Konu seçim/atama dialog'larında `subjects.exam_type` filtresi yok — bir 8. sınıf öğrencisine YKS konusu atanabiliyor olabilir.
4. **Müdür mufredat görünümü** LGS'yi gösteriyor mu kontrol edilmeli.
5. **Analytics**: dashboard chart'ları `exam_type` ayrımı yapmıyor — bir kurum hem LGS hem YKS koçluğu yapıyorsa tek pot'ta gözüküyor.

---

## 🏢 B2B HAZIRLIK — MEVCUT KOD GÖRÜNÜMÜ

**Mevcut model bireysel/freelance koç odaklı:**
- `profiles.role = 'coach'` tek seviye
- Koçun "patronu" yok; herkes peer
- `students.coach_id` öğrenciyi tek bir koça bağlar (öğrenci bir kuruma değil)
- Müdür (`role='admin'`) sistemin patronu — single tenant

**B2B için ihtiyaç olan değişikliklerin yüksek seviye özeti** (detay `b2b-refactor-plan.md`'de):
1. `organizations` tablosu
2. `profiles.organization_id` (nullable; null=bireysel)
3. `organization_admin` rolü (kurumun yöneticisi)
4. RLS güncellemeleri (kurum scope'lu)
5. UI conditional render
6. Branding (logo, primary color)
7. Onboarding flow ikiye ayrılır

---

## 📋 ÖZET — TAMAMLAMA SIRASI ÖNERİSİ

1. **KB-1 + KB-2 + KB-3** (kritik bug'lar + güvenlik açığı) — 1 oturum
2. **LGS desteği eksik parçalar** (kolay, hızlı kazanç) — 1 oturum
3. **P-1 + P-2 + P-3** (performans hissi en çok bunlar etkiler) — 1 oturum
4. **S-4 + S-5 + S-6 + E-2** (orta öncelikli güvenlik/UX iyileştirmeleri)
5. **B2B refactor** — ayrı plan, adım adım

---

> **Not:** Bu rapor saf analiz — hiçbir kod henüz değiştirilmedi. Her bulgu için düzeltme önerisi var; sıra ile uygulanması için onayınızı bekliyorum.

---

## ✅ UYGULANANLAR (onay sonrası, 2026-05-25 oturumu)

- **KB-1 (Bug 2 — localhost link):** `lib/site-url.ts` helper eklendi; `lib/auth/invite.ts` ve diğer 6 dosyadaki fallback'ler bu helper'a yönlendi. Localhost fallback artık kalmadı.
  - ⚠️ **User-action:** `.env.local`'e `NEXT_PUBLIC_SITE_URL=https://www.kocupakedemi.com` satırı eklenmeli (permission'lar nedeniyle benim tarafımdan eklenemedi). Supabase Dashboard → Authentication → URL Configuration ayarları da production'a güncellenmeli.
- **KB-2 (Bug 1 — hayalet koç):** Migration `110_fk_safe_user_deletion.sql` uygulandı. FK'lerin tümü `ON DELETE SET NULL`'a çevrildi. `delete_coach_safely` ve `delete_student_safely` SECURITY DEFINER function'ları eklendi. `lib/auth/invite.ts`'e hayalet kayıt cleanup'ı eklendi (`cleanupGhostUserIfAny`). Müdür/koç silme action'ları yeni RPC'lere yönlendirildi.
- **KB-3 (güvenlik açığı):** `app/koc/ogrenciler/actions.ts`'de `deleteStudentAction`, `toggleStudentActiveAction`, `updateStudentAction` artık `requireCoachOwnership` ile auth+ownership doğruluyor.
- **LGS desteği:** Mevcut migrationlara ek olarak: `lib/exam-target.ts` helper; koç/student-form'da 7-8. sınıf seçenekleri; koç+müdür action zod enum'ları güncellendi; `AssignTopicDialog` öğrencinin sınıfına göre LGS/YKS subject'leri filtreliyor.
- **Performans:** `lib/auth/current-user.ts` (React 19 `cache()` ile profile lookup); layout'lar bu helper'ı kullanıyor; 16 adet `loading.tsx` skeleton eklendi; `components/shared/page-skeleton.tsx`; migration `111_perf_indexes.sql` (composite + missing index'ler).
- **B2B refactor (Adım 1-5):** Migration `120_create_organizations.sql` uygulandı (`organizations` tablo, `profiles.organization_id`, `students.organization_id`, `org_admin` rolü, helper fonksiyonlar, RLS). `/kurum` route segmenti, sidebar, layout, dashboard, koçlar, öğrenciler, ayarlar (branding form), analitik (placeholder). `proxy.ts` org_admin redirect eklendi. `inviteCoachToOrg` ve `updateOrgBranding` server action'ları.

**Henüz yapılmayanlar (ileride):**
- Onboarding flow split (bireysel/kurum)
- Custom domain + email template branding
- Kurum-level analitik chart'ları
- B2B billing/subscription
- KB-4 (service role key rotation — bu user-action)
- S-4 başvuru formu rate limit / captcha
- S-6 applications.email unique constraint (veya app-level kontrol)
- E-2 server action error mesajları daha spesifik
- E-4 production logger (Sentry vb.)
- P-3 müdür dashboard query optimizasyonu (date_trunc aggregation)
- P-4 koç dashboard payments unfiltered nested join
- P-6 recharts/md-editor dynamic import
