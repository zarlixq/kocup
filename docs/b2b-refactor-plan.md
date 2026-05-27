# KoçUp — B2B Refactor Planı

> Tarih: 2026-05-25  
> Bağımlı: `docs/audit-report.md` (özellikle KB-2 ve LGS bulguları)

KoçUp şu an **bireysel/freelance koç** modelinde tasarlanmış. Hedef: dershane, eğitim merkezi, kurslar gibi **kurumsal müşterilere** de uygun bir platform haline gelmek — ama bireysel koçları da kaybetmeden.

Bu refactor **kademeli** olarak yapılacak. Önce **veri modeli** + **RLS**, sonra **UI conditional render**, sonra **branding/whitelabel**.

---

## 🎯 Hedefler

1. **Tek koç (bireysel)** kullanım deneyimi bozulmasın
2. **Kurum (organization)** kavramı sisteme entegre olsun
3. **Kurum admini** (multi-coach view, kurum-level analytics) yeni bir rol olsun
4. **Branding altyapısı** kurum bazında logo + primary color
5. **RLS** kurum scope'unu doğru korusun (kurum A'nın koçu, kurum B'nin öğrencisini göremesin)

---

## 📐 Veri Modeli Değişiklikleri

### Yeni tablo: `organizations`

```sql
create table public.organizations (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  slug           text        unique not null,         -- URL-friendly id (kurum.kocup.com için ileride)
  logo_url       text,
  primary_color  text        check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color   text        check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  plan           text        not null default 'starter'
                              check (plan in ('starter', 'pro', 'enterprise')),
  contact_email  text,
  contact_phone  text,
  address        text,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on public.organizations (slug);
create index on public.organizations (is_active);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
```

### `profiles` tablosuna `organization_id` ve yeni rol

```sql
-- 1. profiles.organization_id — null = bireysel
alter table public.profiles
  add column organization_id uuid references public.organizations(id) on delete set null;

create index on public.profiles (organization_id);

-- 2. role enum'ına 'org_admin' ekle
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'coach', 'admin', 'org_admin'));
```

**Rol semantikleri (sonrası):**
- `student` — öğrenci (kuruma bağlı veya bağımsız)
- `coach` — koç (kuruma bağlı veya freelance)
- `org_admin` — kurum yöneticisi (sadece kendi kurumunu görür)
- `admin` — KoçUp platform süper admin (her şeyi görür, müşteri kurumları yönetir)

**Eski "müdür" (`admin`) → "platform admin"** semantiğine kayıyor. Kurum admini ayrı.

### `students` öğrenci kuruma da bağlanabilsin

Şu an `students.coach_id` zorunlu değil (nullable). Yeni alan:

```sql
alter table public.students
  add column organization_id uuid references public.organizations(id) on delete set null;

create index on public.students (organization_id);
```

Mantık: Bir öğrenci ya bir koça atanmıştır, ya bir kuruma atanmıştır (kurum içinde koç sonradan atanır), ya da hiçbirine. İkinci kombinasyon mümkün: hem coach_id hem organization_id (kurum içinde belirli koça atanmış).

### Migrations sırası

```
100_create_organizations.sql                      # Yeni organizations tablosu + RLS
101_add_organization_id_to_profiles.sql           # profiles.organization_id + 'org_admin' role
102_add_organization_id_to_students.sql           # students.organization_id
103_update_rls_for_organizations.sql              # RLS policy'leri kurum scope ekle
104_helper_functions_organizations.sql            # current_user_org_id(), is_org_admin_of()
```

---

## 🔐 RLS Stratejisi

Mevcut RLS modeli:
- Öğrenci: kendi datası
- Koç: kendi öğrencileri (`is_coach_of(student_id)`)
- Admin (müdür): her şey

Yeni RLS modeli:
- Öğrenci: kendi datası (değişmedi)
- Koç: kendi öğrencileri + (varsa) kurumun öğrencileri (org_admin tarafından atanmamış olsa bile sadece kendi atadıkları)
- Org admin: kurumun TÜM koçları ve öğrencileri (RW)
- Platform admin: her şey (değişmedi)

### Yeni helper functions

```sql
create or replace function public.current_user_org_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_org_admin_of(target_org_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'org_admin'
      and organization_id = target_org_id
  )
$$;
```

### Policy örnekleri (her tablo için pattern aynı)

```sql
-- students: org_admin kendi kurumunun tüm öğrencilerini yönetebilir
create policy "students_org_admin_all" on public.students
  for all
  using (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  );

-- profiles: org_admin kurumunun tüm profillerini görebilir
create policy "profiles_org_admin_select" on public.profiles
  for select using (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  );

-- (student_topics, exams, study_sessions vb. dolaylı yetki — student üzerinden devam ediyor)
```

---

## 🛣 Migration / Geriye Dönük Uyumluluk Stratejisi

**Mevcut sistemin durumu:**
- 1 admin (mevcut "müdür") + 4 koç (seed) + N öğrenci
- Hiçbiri bir org'a bağlı değil

**Geçiş seçenekleri:**

### Seçenek A — Soft migration (önerilen)
- `organization_id` her yerde nullable. Default null.
- Mevcut tüm koç/öğrenci null kalır → bireysel mode'da çalışır.
- Yeni kurum müşterisi geldiğinde: kurum oluştur, koçları kurmaya bağla.

**Avantajı:** mevcut sistem hiçbir şekilde kırılmaz.

### Seçenek B — Hard migration
- Default bir "KoçUp Akademi" organization yarat, mevcut tüm koç/öğrenciyi ona bağla.
- Mevcut "müdür" `org_admin` rolüne dönüştür; platform admin için yeni seed.

**Riski:** mevcut müdürün davranışı değişir; KB-3'tekine benzer RLS sızıntılarına yol açabilir.

**Öneri: Seçenek A**. Mevcut müdürü dokunmayız; yeni müşteri kurumu eklenince yapı çalışır.

---

## 🖥 UI Conditional Render

### Yeni route segmentleri

```
app/
├── kurum/                       # YENİ — org_admin paneli
│   ├── layout.tsx
│   ├── page.tsx                 # Kurum dashboard
│   ├── koclar/                  # Kurum koçları (CRUD)
│   ├── ogrenciler/              # Tüm kurum öğrencileri
│   ├── analitik/                # Kurum-level analitik
│   ├── ayarlar/                 # Branding, plan, iletişim
│   └── davetler/                # Kurum içine koç davet
```

`proxy.ts` (middleware) güncellemesi:
```ts
const roleToPath: Record<string, string> = {
  student: "/ogrenci",
  coach: "/koc",
  admin: "/mudur",
  org_admin: "/kurum",        // YENİ
}
```

### Koç paneli — branding-aware

**Koç bir kuruma bağlıysa:**
- Sidebar logosu kurumun logosu (KoçUp logosu değil)
- Primary color CSS variable olarak set edilir (`:root { --primary: #... }`)
- "KoçUp" markası küçük altyazı olarak kalır (powered by)
- Müşteri editöründe (`payments`, `packages`) **billing özellikleri gizlenir** — kurum admini halletti

**Bireysel koçta:** mevcut deneyim aynen kalır.

### Yapısal yaklaşım

`components/branding/use-branding.tsx` (server component'te branding fetch):
```ts
// Server Component
export async function getBranding(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization:organizations(name, logo_url, primary_color, accent_color)")
    .eq("id", userId)
    .maybeSingle()
  return profile?.organization ?? null
}
```

Sidebar/layout bunu prop olarak alır; null ise default KoçUp branding.

---

## 📊 Kurum Dashboard (kurum admini için)

Mockup özet:

```
┌─────────────────────────────────────────┐
│  [Logo] Kurum Adı            [Profil]   │
├─────────────────────────────────────────┤
│  📊 Toplam Koç: 12 │ Öğrenci: 145 │ ... │
│                                          │
│  ┌────────── Koç Performansı ────────┐  │
│  │  Koç A: 24 öğrenci, %85 hedef     │  │
│  │  Koç B: 18 öğrenci, %72 hedef     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────── Aylık Trend ─────────────┐  │
│  │  Bar/Line chart                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Yeni Koç Davet Et]  [Yeni Öğrenci]    │
└─────────────────────────────────────────┘
```

---

## 🎨 Branding Implementation Notları

**Minimum MVP (Faz 1):**
- Kurum logosu (url)
- Tek primary color
- CSS variable injection

**Faz 2 (sonra):**
- Custom domain (`kurum.kocup.app`)
- Email template branding (gönderen "Falanca Akademi" görünür)
- Whitelabel: "KoçUp" markası tamamen gizlenebilir (plan: enterprise)

**CSS variable injection (Tailwind v4 ile):**
```tsx
<html style={{ "--brand-primary": org?.primary_color ?? "#1B6B8A" } as React.CSSProperties}>
```

Tailwind config'de `bg-primary` → `bg-[var(--brand-primary)]` kullanımına geç (zaman alır — Faz 2).

---

## 📋 Uygulama Sırası (Adım Adım, Plan Onaylanırsa)

### Adım 1 — Veri modeli (≈ 1 oturum)
- Migrations 100-104 yazılır ve uygulanır
- `lib/database.types.ts` regenerate
- Mevcut seed/data dokunulmaz

### Adım 2 — Yeni helper + RLS (≈ 1 oturum)
- `current_user_org_id`, `is_org_admin_of` fonksiyonları
- Tüm tablolara `org_admin` policy'leri eklenir
- Test: Bir test kurum + bir org_admin user + bir koç + bir öğrenci ile RLS doğrulanır

### Adım 3 — `/kurum` route segmenti + layout (≈ 1 oturum)
- `app/kurum/layout.tsx` (role check + branding fetch)
- `app/kurum/page.tsx` (dashboard)
- `proxy.ts` güncellemesi
- `components/kurum/sidebar.tsx`

### Adım 4 — Kurum admin CRUD (≈ 1-2 oturum)
- `app/kurum/koclar/` (kurum içi koç listesi + davet + sil)
- `app/kurum/ogrenciler/` (kurum içi öğrenci listesi)
- Server action: `inviteCoachToOrg(email, full_name, org_id)` — `inviteCoach` üzerine wrapper, `organization_id` set ederek

### Adım 5 — Koç paneli branding-aware (≈ 1 oturum)
- `getBranding()` helper
- `components/koc/sidebar.tsx` logo + color
- CSS variable injection
- Billing özellikleri kurum koçunda gizleme (payments/packages route'larına koşul)

### Adım 6 — Onboarding split (≈ 1 oturum)
- Landing page'e iki CTA: "Bireysel Koç İçin" / "Kurumlar İçin"
- Kurumlar için ayrı `/basvuru/kurum` (kurum bilgileri + plan seçimi)
- Bireysel koçluk için mevcut flow korunur

### Adım 7 — Analytics + Plan/Billing (Faz 2, daha sonra)
- Kurum-level analitik (cross-coach comparison)
- Subscription/payment için Stripe/Iyzico entegrasyonu (out of scope şimdilik)

---

## ⚠️ Riskler ve Açık Sorular

1. **Mevcut müdür rolü ne olacak?** Şu an `admin` rolü her şeyi görür. Yeni model'de `admin` = platform admin (KoçUp ekibi). Tek müdür hesabı varsa, ad+rol değişimi sorun değil. **Karar: `admin` kalır, semantiği "platform süper admin"e kayar.**

2. **Bireysel koç → kurum koçu geçişi?** Bir koç sisteme bireysel girip sonra bir kuruma katılırsa? `organization_id` update'i mümkün, öğrencileri ne olacak? Karar: Koç bir kuruma katılırken öğrencilerini "yanında getirip getirmediği" UI'da sorulur.

3. **Trial / free plan?** Plan field var ama kullanılmıyor şimdilik. Faz 2 konusu.

4. **Eski Migration'lar etkilenir mi?** Mevcut migrationların hiçbirine dokunmuyoruz, sadece ekliyoruz. Geriye uyumluluk korunur.

5. **`students.coach_id` ile `organization_id` çakışması:** Bir öğrenci hem belirli koça hem belirli kuruma atanmış olabilir (kurum içindeki koça). Coach kurumun bir üyesi değilse bu tutarsızlık olur. Constraint:
   ```sql
   alter table public.students
     add constraint students_coach_in_org_check
     check (
       coach_id is null or organization_id is null
       or exists (select 1 from profiles where id = coach_id and organization_id = students.organization_id)
     );
   ```
   Bu check constraint subquery'ye izin vermez Postgres'te; trigger ile yapılabilir. **Karar: Faz 1'de bu integrity check ertelenir, application-level kontrol.**

---

## ✅ Plan Onayı

Bu plan onaylanırsa **Adım 1**'den başlayacağım. Her adım sonunda:
- Ne değişti?
- Hangi dosyalar etkilendi?
- Neyi test etmen lazım?

şeklinde özet veririm. Onay/değişiklik istersen ara verir, plan üzerinden ilerleriz.

> Bireysel koçluk deneyimi her adımda korunacak — kurum yapısı opt-in.
