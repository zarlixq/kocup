import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, ListVideo, NotebookPen, Route } from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { GoogleButton } from "@/components/bireysel/google-button"
import { isGoogleAuthEnabled } from "@/lib/auth/oauth"
import { UcretsizForm } from "./form"

// Reklam açılış sayfası: tek ekran değer önerisi + kayıt formu. Statik (10 dk ISR —
// Google sağlayıcısı açılınca buton kendiliğinden görünür); UTM istemcide okunur.
export const revalidate = 600

export const metadata: Metadata = {
  title: "Ücretsiz Başla — Koçun Yoksa da Planlı Çalış",
  description:
    "UpPlan sana sınava kadar kişisel yol haritası ve haftalık program çıkarır, izlediğin playlist'i takip eder, yanlışlarından eksik konularını bulur. Tamamen ücretsiz.",
  alternates: { canonical: "/ucretsiz" },
}

const POINTS = [
  { icon: Route, title: "Kişisel yol haritası", text: "Sınava kalan süreye ve seviyene göre hangi konuya ne zaman çalışacağın, haftalık programınla birlikte." },
  { icon: ListVideo, title: "Playlist takibi", text: "İzlediğin YouTube playlist'ini ekle; hangi videodasın, bugün neyi izleyeceksin, takip edilir." },
  { icon: NotebookPen, title: "Yanlış defteri", text: "Yanlışlarını kaydet; hangi konu ve bilgide eksik olduğun listelenir, tekrarın programa eklenir." },
]

const FAQ = [
  {
    q: "Gerçekten ücretsiz mi?",
    a: "Evet. UpPlan, yol haritası, haftalık program, playlist takibi ve yanlış defteri ücretsiz. Kredi kartı istemiyoruz.",
  },
  {
    q: "Verilerim güvende mi?",
    a: "Verilerin yalnızca sana plan çıkarmak için kullanılır, kimseyle paylaşılmaz ve reklam amacıyla satılmaz. İstediğin an hesabını ve tüm verilerini ayarlardan silebilirsin. Ayrıntılar KVKK Aydınlatma Metni'nde.",
  },
  {
    q: "Koçum varsa kullanabilir miyim?",
    a: "Bu ücretsiz hesap koçu olmayan öğrenciler için. Koçun KoçUp kullanıyorsa seni davet etsin; böylece programın koçunla birlikte ilerler.",
  },
]

export default async function UcretsizPage() {
  const google = await isGoogleAuthEnabled()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="KoçUp ana sayfa">
          <BrandLogo className="h-8 w-auto" />
        </Link>
        <Link href="/giris/ogrenci" className="text-sm font-medium text-[#1B6B8A] hover:underline">
          Giriş yap
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-12 md:grid-cols-[minmax(0,1fr)_440px] md:items-start md:gap-10 md:pt-6">
        <div className="md:pt-4">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-zinc-900 md:text-4xl">
            Koçun yoksa da <span className="text-[#1B6B8A]">planlı çalış.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-600 md:mt-3 md:text-base">
            UpPlan sana sınava kadar kişisel yol haritası ve haftalık program çıkarır, izlediğin playlist&apos;i takip
            eder, yanlışlarından eksik konularını bulur. Tamamen ücretsiz.
          </p>

          <ul className="mt-6 hidden space-y-4 md:block">
            {POINTS.map((p) => (
              <Point key={p.title} {...p} />
            ))}
          </ul>
        </div>

        <section aria-labelledby="kayit-baslik" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
          <h2 id="kayit-baslik" className="text-lg font-bold text-zinc-900">
            Ücretsiz hesabını oluştur
          </h2>
          <p className="mb-4 mt-0.5 text-sm text-zinc-500">Kredi kartı yok · 2 dakikada kurulum</p>
          {google && (
            <div className="mb-4 space-y-4">
              <GoogleButton />
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="h-px flex-1 bg-zinc-200" /> veya e-postayla <span className="h-px flex-1 bg-zinc-200" />
              </div>
            </div>
          )}
          <UcretsizForm />
          <p className="mt-5 text-center text-sm text-zinc-500">
            Zaten hesabın var mı?{" "}
            <Link href="/giris/ogrenci" className="font-medium text-[#1B6B8A] hover:underline">
              Giriş yap
            </Link>
          </p>
        </section>

        <div className="space-y-8 md:col-span-2">
          <ul className="space-y-4 md:hidden">
            {POINTS.map((p) => (
              <Point key={p.title} {...p} />
            ))}
          </ul>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <Image
              src="/images/upplan/yol-haritasi.png"
              alt="UpPlan yol haritası ekranı"
              width={1593}
              height={912}
              sizes="(min-width: 1024px) 960px, 100vw"
              className="h-auto w-full"
            />
          </div>

          <section aria-labelledby="sss-baslik" className="mx-auto max-w-2xl">
            <h2 id="sss-baslik" className="mb-3 text-lg font-bold text-zinc-900">
              Sık sorulanlar
            </h2>
            <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-zinc-900">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm text-zinc-600">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-zinc-500">
              <Link href="/kvkk-aydinlatma" className="underline">KVKK Aydınlatma Metni</Link> ·{" "}
              <Link href="/gizlilik" className="underline">Gizlilik</Link> ·{" "}
              <Link href="/kullanim-sartlari" className="underline">Kullanım Şartları</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

function Point({ icon: Icon, title, text }: { icon: typeof Route; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F97316]/10">
        <Icon className="h-5 w-5 text-[#F97316]" />
      </span>
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <p className="text-sm text-zinc-600">{text}</p>
      </div>
    </li>
  )
}
