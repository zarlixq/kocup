import Link from "next/link"
import { Calendar, Hash, Target, type LucideIcon } from "lucide-react"

// Koça bağlı sayfaların (Koçum, Randevularım, Etüt) koçsuz öğrencideki boş ekranı:
// kırık/boş görünmek yerine durumu açıklar ve koçsuz kullanılabilen araçlara yönlendirir.
const TOOLS = [
  { href: "/ogrenci/program", label: "Haftalık programını kur", icon: Calendar },
  { href: "/ogrenci/konularim", label: "Konu hedefi koy", icon: Target },
  { href: "/ogrenci/soru-cozum/yeni", label: "Soru çözüm kaydet", icon: Hash },
]

export function NoCoachState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
        <Icon className="h-6 w-6 text-[#F97316]" />
      </div>
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      <div className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-700 hover:border-orange-300 hover:bg-orange-50/50 sm:flex-col sm:gap-1.5 sm:text-xs"
          >
            <t.icon className="h-4 w-4 text-[#F97316]" />
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
