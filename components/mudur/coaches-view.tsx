"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Plus, UserCog } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InviteCoachDialog } from "@/components/mudur/invite-coach-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { deleteCoach } from "@/app/mudur/koclar/actions"

export type CoachRow = {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string | null
  student_count: number
  students: { id: string; full_name: string; grade: string | null }[]
}

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
  const [detailCoach, setDetailCoach] = useState<CoachRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CoachRow | null>(null)

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
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Koç</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-center">Öğrenci</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                          {initials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-900">{c.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600">{c.email}</TableCell>
                  <TableCell className="text-zinc-600">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums text-zinc-900 font-medium">
                    {c.student_count}
                  </TableCell>
                  <TableCell className="text-zinc-600">{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="paid">Aktif</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailCoach(c)}>
                          Detay
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

      <InviteCoachDialog open={showInvite} onOpenChange={setShowInvite} />

      <Dialog open={!!detailCoach} onOpenChange={(o) => !o && setDetailCoach(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailCoach?.full_name}</DialogTitle>
          </DialogHeader>
          {detailCoach && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <div className="text-zinc-500">{detailCoach.email}</div>
                {detailCoach.phone && <div className="text-zinc-500">{detailCoach.phone}</div>}
                <div className="text-zinc-400 text-xs">
                  Kayıt: {formatDate(detailCoach.created_at)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                  Atanmış Öğrenciler ({detailCoach.student_count})
                </h3>
                {detailCoach.students.length === 0 ? (
                  <p className="text-sm text-zinc-500">Bu koça henüz öğrenci atanmamış.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detailCoach.students.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between text-sm bg-zinc-50 px-3 py-2 rounded-lg"
                      >
                        <span className="text-zinc-900">{s.full_name}</span>
                        <span className="text-zinc-500">{s.grade ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
