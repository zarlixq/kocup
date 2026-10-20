import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { UcretsizBaslaForm } from "./form"

export const metadata: Metadata = {
  title: "Ücretsiz Başla — UpPlan ile Planlı Çalış",
  description:
    "Koçun yoksa bile planlı çalış: UpPlan sana kişisel yol haritası ve haftalık program çıkarır, yanlışlarından eksik konularını bulur. Ücretsiz.",
  alternates: { canonical: "/ucretsiz-basla" },
}

const POINTS = [
  "Kişisel yol haritası ve haftalık program",
  "Yanlışlarından eksik formül ve konuların",
  "Soru, deneme ve konu takibi tek yerde",
]

function utmValue(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v
  return s ? s.slice(0, 100) : null
}

export default async function UcretsizBaslaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const utm = {
    utm_source: utmValue(sp.utm_source),
    utm_medium: utmValue(sp.utm_medium),
    utm_campaign: utmValue(sp.utm_campaign),
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 md:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_440px] md:items-start">
        <div className="md:pt-6">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
            Koçun yoksa bile <span className="text-[#1B6B8A]">planlı çalış.</span>
          </h1>
          <p className="mt-3 text-zinc-600">
            UpPlan seviyeni ve müsait saatlerini öğrenir, sana kişisel yol haritası ve haftalık program çıkarır.
            Ücretsiz.
          </p>
          <ul className="mt-6 space-y-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-zinc-900">Ücretsiz hesabını oluştur</h2>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Kayıttan sonra e-postanı doğrulaman gerekecek.</p>
          <UcretsizBaslaForm utm={utm} />
          <p className="mt-6 text-center text-sm text-zinc-500">
            Zaten hesabın var mı?{" "}
            <Link href="/giris/ogrenci" className="font-medium text-[#1B6B8A] hover:underline">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
