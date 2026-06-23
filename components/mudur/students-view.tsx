"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { MoreHorizontal, GraduationCap, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { AssignCoachDialog } from "@/components/mudur/assign-coach-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { getUserStatus } from "@/lib/user-status"
import { deleteStudent } from "@/app/mudur/ogrenciler/actions"

export type StudentRow = {
  id: string
  full_name: string
  email: string
  grade: string | null
  coach_id: string | null
  coach_name: string | null
  target_department: string | null
  parent_phone: string | null
  is_active: boolean
  first_login_at: string | null
  created_at: string | null
}

type Coach = { id: string; full_name: string }

const GRADES = ["7", "8", "9", "10", "11", "12", "Mezun"] as const
const ALL = "__all__"
const UNASSIGNED = "__unassigned__"
const STATUS_OPTIONS = [
  { value: "pending", label: "Davet Bekliyor" },
  { value: "active", label: "Aktif" },
  { value: "passive", label: "Pasif" },
] as const

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

function truncate(s: string | null, n: number) {
  if (!s) return "—"
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

export function StudentsView({
  students,
  coaches,
  headerAction,
}: {
  students: StudentRow[]
  coaches: Coach[]
  headerAction?: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [grade, setGrade] = useState<string>(ALL)
  const [coachFilter, setCoachFilter] = useState<string>(ALL)
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [assignTarget, setAssignTarget] = useState<StudentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((s) => {
      if (q && !s.full_name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) {
        return false
      }
      if (grade !== ALL && s.grade !== grade) return false
      if (coachFilter === UNASSIGNED && s.coach_id !== null) return false
      if (coachFilter !== ALL && coachFilter !== UNASSIGNED && s.coach_id !== coachFilter) return false
      const status = getUserStatus({
        first_login_at: s.first_login_at,
        is_active: s.is_active,
      })
      if (statusFilter === "pending" && status !== "pending") return false
      if (statusFilter === "active" && status !== "active") return false
      if (statusFilter === "passive" && status !== "inactive") return false
      return true
    })
  }, [students, query, grade, coachFilter, statusFilter])

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteStudent(deleteTarget.id)
      if (result.success) {
        toast.success("Öğrenci silindi.")
        setDeleteTarget(null)
      } else {
        toast.error(result.error ?? "Silinemedi.")
      }
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Öğrenciler</h1>
          <p className="text-sm text-zinc-500 mt-1">{students.length} kayıtlı öğrenci</p>
        </div>
        {headerAction}
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Ad veya email ile ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm sınıflar</SelectItem>
            {GRADES.map((g) => (
              <SelectItem key={g} value={g}>
                {g === "Mezun" ? "Mezun" : `${g}. Sınıf`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={coachFilter} onValueChange={setCoachFilter}>
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm koçlar</SelectItem>
            <SelectItem value={UNASSIGNED}>Atanmamış</SelectItem>
            {coaches.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm durumlar</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Henüz öğrenci yok"
          description="Bekleyen başvuruları onaylayarak öğrenci ekleyin."
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Filtreyle eşleşen öğrenci bulunamadı.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Sınıf</TableHead>
                <TableHead>Koç</TableHead>
                <TableHead>Hedef Bölüm</TableHead>
                <TableHead>Veli Telefon</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const status = getUserStatus({
                  first_login_at: s.first_login_at,
                  is_active: s.is_active,
                })
                return (
                <TableRow key={s.id} className={status === "inactive" ? "opacity-50" : undefined}>
                  <TableCell>
                    <Link
                      href={`/mudur/ogrenciler/${s.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                          {initials(s.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-zinc-900 truncate">{s.full_name}</span>
                          <UserStatusBadge status={status} size="sm" />
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{s.email}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {s.grade ? (
                      <Badge variant="outline">{s.grade === "Mezun" ? "Mezun" : `${s.grade}. Sınıf`}</Badge>
                    ) : (
                      <span className="text-zinc-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.coach_name ? (
                      <span className="text-zinc-900">{s.coach_name}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-sm">Atanmamış</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setAssignTarget(s)}
                        >
                          Ata
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600">{truncate(s.target_department, 30)}</TableCell>
                  <TableCell className="text-zinc-600">{s.parent_phone ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600">{formatDate(s.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/mudur/ogrenciler/${s.id}`}>Detay</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignTarget(s)}>
                          {s.coach_id ? "Koç Değiştir" : "Koç Ata"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(s)}
                          className="text-red-600 focus:text-red-600"
                        >
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {assignTarget && (
        <AssignCoachDialog
          open
          onOpenChange={(o) => !o && setAssignTarget(null)}
          studentId={assignTarget.id}
          studentName={assignTarget.full_name}
          currentCoachId={assignTarget.coach_id}
          coaches={coaches}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Öğrenciyi sil?</AlertDialogTitle>
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
