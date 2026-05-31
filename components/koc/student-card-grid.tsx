"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, X, Users, GraduationCap, Activity, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { cn } from "@/lib/utils"
import { getUserStatus } from "@/lib/user-status"

export type StudentCardRow = {
  id: string
  fullName: string
  email: string
  grade: string | null
  isActive: boolean
  firstLoginAt: string | null
  weekQuestions: number
  totalTopics: number
  completedTopics: number
  lastActivityAt: string | null
}

type StatusFilter = "all" | "active" | "pending" | "inactive"

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Henüz aktivite yok"
  const now = new Date()
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / day)
  if (days <= 0) return "Bugün"
  if (days === 1) return "Dün"
  if (days < 7) return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  if (days < 365) return `${Math.floor(days / 30)} ay önce`
  return `${Math.floor(days / 365)} yıl önce`
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "pending", label: "Davet Bekliyor" },
  { value: "inactive", label: "Pasif" },
]

type Props = {
  students: StudentCardRow[]
}

export function StudentCardGrid({ students }: Props) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")

  const counts = useMemo(() => {
    let active = 0
    let pending = 0
    let inactive = 0
    for (const s of students) {
      const st = getUserStatus({
        first_login_at: s.firstLoginAt,
        is_active: s.isActive,
      })
      if (st === "active") active++
      else if (st === "pending") pending++
      else inactive++
    }
    return { all: students.length, active, pending, inactive }
  }, [students])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    const list = students.filter((s) => {
      if (q) {
        const name = s.fullName.toLocaleLowerCase("tr-TR")
        const email = s.email.toLocaleLowerCase("tr-TR")
        if (!name.includes(q) && !email.includes(q)) return false
      }
      const st = getUserStatus({
        first_login_at: s.firstLoginAt,
        is_active: s.isActive,
      })
      if (status === "active" && st !== "active") return false
      if (status === "pending" && st !== "pending") return false
      if (status === "inactive" && st !== "inactive") return false
      return true
    })

    // Pasif/inactive sona
    return list.sort((a, b) => {
      const sa = getUserStatus({ first_login_at: a.firstLoginAt, is_active: a.isActive })
      const sb = getUserStatus({ first_login_at: b.firstLoginAt, is_active: b.isActive })
      if (sa === "inactive" && sb !== "inactive") return 1
      if (sb === "inactive" && sa !== "inactive") return -1
      // sonra en son aktiviteye göre desc
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      return tb - ta
    })
  }, [students, query, status])

  if (students.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <Users className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">
          Henüz öğrencin yok
        </h3>
        <p className="text-sm text-zinc-500 mb-5">
          İlk öğrencini ekleyerek başla.
        </p>
        <Link href="/koc/ogrenciler/yeni">
          <Button variant="accent">İlk Öğrencini Ekle</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Öğrenci ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="-mx-1 px-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 min-w-min">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? counts.all
                  : f.value === "active"
                  ? counts.active
                  : f.value === "pending"
                  ? counts.pending
                  : counts.inactive
              const isActive = status === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50",
                  )}
                  aria-pressed={isActive}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums text-xs rounded-full px-1.5",
                      isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Bu filtreyle eşleşen öğrenci yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function StudentCard({ student: s }: { student: StudentCardRow }) {
  const status = getUserStatus({
    first_login_at: s.firstLoginAt,
    is_active: s.isActive,
  })
  const isInactive = status === "inactive"
  const topicProgress =
    s.totalTopics > 0 ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0

  return (
    <Link
      href={`/koc/ogrenciler/${s.id}`}
      className={cn(
        "block bg-white border border-zinc-200 rounded-2xl p-4 transition-all",
        "hover:border-[#1B6B8A]/40 hover:shadow-md hover:-translate-y-0.5",
        isInactive && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback
            className="text-white text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #1B6B8A 0%, #F97316 100%)",
            }}
          >
            {initials(s.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-zinc-900 truncate text-sm">
              {s.fullName}
            </h3>
            <UserStatusBadge status={status} size="sm" />
          </div>
          <div className="text-xs text-zinc-500 truncate">{s.email}</div>
          {s.grade && (
            <Badge variant="outline" className="mt-1.5 text-[10px] py-0">
              <GraduationCap className="h-3 w-3 mr-1" />
              {s.grade === "Mezun" ? "Mezun" : `${s.grade}. Sınıf`}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
        {/* Konu ilerleme bar */}
        {s.totalTopics > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Konu ilerleme</span>
              <span className="tabular-nums text-zinc-700 font-medium">
                {s.completedTopics}/{s.totalTopics}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1B6B8A] to-[#F97316] rounded-full transition-all"
                style={{ width: `${topicProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 text-zinc-500">
            <Activity className="h-3 w-3" />
            Bu hafta
          </span>
          <span className="tabular-nums font-semibold text-zinc-900">
            {s.weekQuestions.toLocaleString("tr-TR")} soru
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 text-zinc-500">
            <Clock className="h-3 w-3" />
            Son aktivite
          </span>
          <span className="text-zinc-700">{relativeTime(s.lastActivityAt)}</span>
        </div>
      </div>
    </Link>
  )
}
