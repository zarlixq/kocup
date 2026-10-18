import Link from "next/link"
import { Calendar, Hash, Target, UserCog } from "lucide-react"

// Koçu olmayan öğrencinin dashboard kartı: CoachCard'ın boş hâli yerine
// koçsuz da yapılabilecek işlere yönlendirir.
export function SelfCoachCard({ title, description }: { title: string; description: string }) {
  const actions = [
    { href: "/ogrenci/program", label: "Programını kur", icon: Calendar },
    { href: "/ogrenci/konularim", label: "Hedef koy", icon: Target },
    { href: "/ogrenci/soru-cozum/yeni", label: "Soru kaydet", icon: Hash },
  ]
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-1 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-[#F97316]" /> {title}
      </h3>
      <p className="text-sm text-zinc-500">{description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 px-2 py-3 text-center text-xs font-medium text-zinc-700 hover:border-orange-300 hover:bg-orange-50/50"
          >
            <a.icon className="h-4 w-4 text-[#F97316]" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
