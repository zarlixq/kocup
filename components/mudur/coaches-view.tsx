"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { MoreHorizontal, Plus, UserCog } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CoachSourceBadge } from "@/components/mudur/coach-source-badge"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { ResendInviteButton } from "@/components/shared/resend-invite-button"
import { cn } from "@/lib/utils"
import type { CoachSource } from "@/lib/coach-source"
import { getUserStatus } from "@/lib/user-status"
import { resendCoachInvitationMudur } from "@/app/mudur/koclar/actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InviteCoachDialog } from "@/components/mudur/invite-coach-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { deleteCoach } from "@/app/mudur/koclar/actions"

export type CoachRow = {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string | null
  coach_source: string | null
  first_login_at: string | null
  student_count: number
  students: { id: string; full_name: string; grade: string | null }[]
}

type SourceFilter = "all" | CoachSource

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "internal", label: "KoçUp" },
  { value: "external", label: "Bağımsız" },
]

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

export function CoachesView({ coaches }: { coaches: CoachRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CoachRow | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")

  const counts = useMemo(() => {
    let internal = 0
    let external = 0
    for (const c of coaches) {
      if (c.coach_source === "external") external++
      else internal++
    }
    return { all: coaches.length, internal, external }
  }, [coaches])

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return coaches
    return coaches.filter((c) => {
      const src = c.coach_source === "external" ? "external" : "internal"
      return src === sourceFilter
    })
  }, [coaches, sourceFilter])

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteCoach(deleteTarget.id)
      if (result.success) {
        toast.success("Koç silindi.")
        setDeleteTarget(null)
      } else {
        toast.error(result.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Koçlar</h1>
          <p className="text-sm text-zinc-500 mt-1">{coaches.length} kayıtlı koç</p>
        </div>
        <Button className="bg-[#1B6B8A] hover:bg-[#155a75]" onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Yeni Koç Ekle
        </Button>
      </div>

      {coaches.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Henüz koç eklenmemiş"
          description="Sağ üstten yeni koç ekleyin."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? counts.all
                  : f.value === "internal"
                  ? counts.internal
                  : counts.external
              const isActive = sourceFilter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setSourceFilter(f.value)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                    isActive
                      ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50",
                  )}
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

          {filtered.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
              Bu kaynak filtresine uyan koç yok.
            </div>
          ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Koç</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-center">Öğrenci</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/mudur/koclar/${c.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                          {initials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-900">{c.full_name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CoachSourceBadge source={c.coach_source} />
                  </TableCell>
                  <TableCell className="text-zinc-600">{c.email}</TableCell>
                  <TableCell className="text-zinc-600">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums text-zinc-900 font-medium">
                    {c.student_count}
                  </TableCell>
                  <TableCell className="text-zinc-600">{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    {(() => {
                      const status = getUserStatus({ first_login_at: c.first_login_at })
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <UserStatusBadge status={status} />
                          {status === "pending" && (
                            <ResendInviteButton
                              userName={c.full_name}
                              email={c.email}
                              action={async () => resendCoachInvitationMudur(c.id)}
                              size="sm"
                              variant="ghost"
                              label="Tekrar gönder"
                              className="h-7 px-2 text-xs text-[#1B6B8A] hover:bg-[#1B6B8A]/10"
                            />
                          )}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/mudur/koclar/${c.id}`}>Detay</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(c)}
                          className="text-red-600 focus:text-red-600"
                        >
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
          )}
        </>
      )}

      <InviteCoachDialog open={showInvite} onOpenChange={setShowInvite} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Koçu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.full_name}</span> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
