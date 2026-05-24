# KoçUp — Project Rules

KoçUp, öğrenci koçluk yönetim sistemidir. Üç panelden oluşur: öğrenci, koç, müdür.

## Stack

- Next.js 16 (App Router, **NO src dir**)
- TypeScript (strict)
- Tailwind CSS
- shadcn/ui (component library)
- Supabase (auth + db + RLS + storage)
- Recharts (grafikler)
- Zustand (gerekirse client state)

## Mevcut Modüller

- **Muhasebe modülü** — `/admin` altında. Bu modülü ASLA kırma, dokunma, taşıma.

## Klasör Yapısı

```
app/
├── (public)/          # Auth gerektirmeyen sayfalar
├── ogrenci/           # role='student' korumalı
├── koc/               # role='coach' korumalı
├── mudur/             # role='admin' korumalı
└── admin/             # MEVCUT MUHASEBE MODÜLÜ, DOKUNMA

components/
├── ui/                # shadcn componentleri
└── [feature]/         # feature bazlı componentler

lib/
├── supabase/
│   ├── client.ts      # browser client
│   ├── server.ts      # server client (RSC, server actions)
│   └── admin.ts       # service role (sadece server, env'den)
└── database.types.ts  # supabase gen types ile üretilir
```

## Brand & UI

- Primary: `#1B6B8A` (dark blue)
- Accent: `#F97316` (orange)
- Logo: `public/images/logo.png`
- Mobile-first tasarım
- Dark mode opsiyonel (şimdilik light)

## Dil

- Tüm UI metinleri **Türkçe**
- Tarih formatı: `DD.MM.YYYY`
- Saat formatı: 24 saat (`14:30`)
- Para birimi: `₺` (TL)

## Kod Kuralları

### Yap

- Server components default kullan
- Client component sadece interaktif yerlerde (`'use client'`)
- Data fetching: Server Components içinde direkt Supabase çağrısı
- Mutation: Server Actions (`'use server'`)
- Form validation: Zod
- Error handling: try/catch + kullanıcıya Türkçe hata mesajı (toast/sonner ile)
- Type-safe: `lib/database.types.ts`'den türleri import et

### Yapma

- `any` type kullanma (kesinlikle gerekliyse `unknown` + type guard)
- `localStorage` / `sessionStorage` kullanma (Supabase'de tut)
- API key'i client'a expose etme (`NEXT_PUBLIC_` prefix dikkat)
- API routes yazma (Server Actions yeterli, istisnai durumlarda route handler)
- Inline style kullanma (Tailwind class'ları yeterli)
- `useEffect` ile fetch yapma (Server Component'te al, prop olarak geçir)
- Mevcut muhasebe modülüne (`/admin`) dokunma

## Supabase Kullanımı

- Tablo/migration: Supabase MCP ile uygula (manuel SQL yazma)
- RLS: HER tabloda aktif olmalı, exception yok
- Service role key: sadece server-side, `SUPABASE_SERVICE_ROLE_KEY` env'den
- Her tablo değişikliğinden sonra: `supabase gen types typescript` → `lib/database.types.ts` güncelle

## Komutlar

```bash
npm run dev              # dev server
npm run build            # prod build
npm run type-check       # tsc --noEmit
npm run lint             # eslint
```

## Auth Roller

- `student` → `/ogrenci/*` erişebilir
- `coach` → `/koc/*` erişebilir
- `admin` → `/mudur/*` erişebilir + her şey

Middleware (`proxy.ts`) bunları zorlar. Yanlış role kendi paneline redirect.

> Next.js 16'da `middleware.ts` yerine `proxy.ts` kullanılır. Auth/role enforcement burada (root'taki `proxy.ts` → `lib/supabase/middleware.ts`).

## Hata Yönetimi

- Server action: `{ success: boolean, error?: string, data?: T }` döndür
- Client'ta: `sonner` toast ile göster
- Beklenmeyen hatalar: `console.error` + kullanıcıya generic mesaj ("Bir hata oluştu, tekrar deneyin")

## Tablo İsimlendirme

Muhasebe modülünün öğrenci listesi tablosu `clients` olarak adlandırılmıştır (migration `050_rename_students_to_clients`).
Brief'in panel sistemindeki `students` tablosu (auth.users bağlı portal kullanıcıları) farklıdır — ad çakışması önlendi.
`coaches` tablosu muhasebe için olduğu gibi kalır; yeni `profiles` tablosu panel sistemi için ayrıdır.

## Commit Mesajları

Conventional commits:
- `feat: ogrenci paneli dashboard`
- `fix: rls policy ogrenci-koc iliskisi`
- `chore: shadcn dialog component`
- `refactor: server action error handling`