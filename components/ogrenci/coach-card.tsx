import Link from "next/link"
import { Mail, Calendar, UserCog } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type CoachInfo = {
  full_name: string
  email: string
} | null

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function CoachCard({ coach }: { coach: CoachInfo }) {
  if (!coach) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-zinc-400" /> Koçum
        </h3>
        <div className="text-sm text-zinc-500">
          Henüz bir koç atanmadı. Müdürle iletişime geç.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
        <UserCog className="h-4 w-4 text-[#1B6B8A]" /> Koçum
      </h3>
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-[#1B6B8A] text-white">
            {initials(coach.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 truncate">{coach.full_name}</div>
          <div className="text-xs text-zinc-500 truncate">{coach.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`mailto:${coach.email}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B6B8A] bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg transition-colors flex-1 justify-center"
        >
          <Mail className="h-3.5 w-3.5" /> E-posta
        </a>
        <Link
          href="/ogrenci/randevularim"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#F97316] hover:bg-orange-600 px-3 py-2 rounded-lg transition-colors flex-1 justify-center"
        >
          <Calendar className="h-3.5 w-3.5" /> Randevular
        </Link>
      </div>
    </div>
  )
}
