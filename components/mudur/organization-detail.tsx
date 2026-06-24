"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, Search, X, UserCog } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { inviteCoachToOrganization } from "@/app/mudur/kurumlar/actions"
import { BulkImportButton } from "@/components/import/bulk-import-button"

export type DetailCoach = {
  id: string
  full_name: string
  email: string
  status: "aktif" | "beklemede"
  student_count: number
}

export type DetailStudent = {
  id: string
  full_name: string
  email: string
  grade: string | null
  coach_id: string | null
  coach_name: string | null
  status: "aktif" | "beklemede"
}

const ALL = "__all__"
const PAGE_SIZE = 25

function StatusBadge({ status }: { status: "aktif" | "beklemede" }) {
  return status === "aktif" ? (
    <Badge variant="outline" className="text-green-700 border-green-200">Aktif</Badge>
  ) : (
    <Badge variant="outline" className="text-amber-700 border-amber-200">Beklemede</Badge>
  )
}

export function OrganizationDetail({
  orgId,
  coaches,
  students,
}: {
  orgId: string
  coaches: DetailCoach[]
  students: DetailStudent[]
}) {
  const [coachDialogOpen, setCoachDialogOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [coachFilter, setCoachFilter] = useState<string>(ALL)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr")
    return students.filter((s) => {
      if (coachFilter !== ALL && s.coach_id !== coachFilter) return false
      if (q) {
        const hay = `${s.full_name} ${s.email}`.toLocaleLowerCase("tr")
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [students, query, coachFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  function resetPage() {
    setPage(0)
  }

  return (
    <div className="space-y-8">
      {/* Koçlar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Koçlar ({coaches.length})</h2>
          <Button variant="accent" size="sm" onClick={() => setCoachDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Koç Ekle
          </Button>
        </div>

        {coaches.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-zinc-500">
            Bu kurumda henüz koç yok. Önce koç ekleyin, sonra öğrenci aktarın.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coaches.map((c) => (
              <div key={c.id} className="bg-white border border-zinc-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1B6B8A]/10 flex items-center justify-center shrink-0">
                    <UserCog className="h-4 w-4 text-[#1B6B8A]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900 truncate">{c.full_name}</div>
                    <div className="text-xs text-zinc-500 truncate">{c.email}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-zinc-500">{c.student_count} öğrenci</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Öğrenciler */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-zinc-900">Öğrenciler ({students.length})</h2>
          <BulkImportButton
            passwordImport={{
              orgId,
              coaches: coaches.map((c) => ({ id: c.id, full_name: c.full_name })),
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Ad veya e-posta ile ara..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                resetPage()
              }}
              className="pl-9 pr-9"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("")
                  resetPage()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label="Temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select
            value={coachFilter}
            onValueChange={(v) => {
              setCoachFilter(v)
              resetPage()
            }}
          >
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="Koç" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm koçlar</SelectItem>
              {coaches.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
            {students.length === 0 ? "Henüz öğrenci yok." : "Bu filtreyle eşleşen öğrenci yok."}
          </div>
        ) : (
          <>
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Öğrenci</TableHead>
                    <TableHead>Koç</TableHead>
                    <TableHead>Sınıf</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium text-zinc-900">{s.full_name}</div>
                        <div className="text-xs text-zinc-500">{s.email}</div>
                      </TableCell>
                      <TableCell className="text-zinc-600">{s.coach_name ?? "Atanmamış"}</TableCell>
                      <TableCell className="text-zinc-600">{s.grade ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>
                  {safePage * PAGE_SIZE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} / {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    Önceki
                  </Button>
                  <span className="tabular-nums">{safePage + 1} / {pageCount}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <CoachInviteDialog orgId={orgId} open={coachDialogOpen} onOpenChange={setCoachDialogOpen} />
    </div>
  )
}

function CoachInviteDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [pending, start] = useTransition()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  function reset() {
    setFullName("")
    setEmail("")
    setPhone("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await inviteCoachToOrganization(orgId, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      })
      if (res.success) {
        toast.success("Koç davet edildi.")
        reset()
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "Davet gönderilemedi.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kuruma Koç Ekle</DialogTitle>
          <DialogDescription>
            Koç e-posta davetiyle eklenir ve bu kuruma bağlanır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="coach-name">Ad Soyad *</Label>
            <Input id="coach-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coach-email">E-posta *</Label>
            <Input id="coach-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coach-phone">Telefon (ops.)</Label>
            <Input id="coach-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Gönderiliyor..." : "Davet Et"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
