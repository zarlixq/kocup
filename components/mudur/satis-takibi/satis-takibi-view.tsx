"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Building2,
  MoreHorizontal,
  Plus,
  Search,
  X,
  CalendarClock,
} from "lucide-react"
import { toast } from "sonner"
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
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDate, isoDate } from "@/lib/format"
import { EmptyState } from "@/components/shared/empty-state"
import { DurumBadge } from "@/components/mudur/satis-takibi/durum-badge"
import { LeadFormDialog } from "@/components/mudur/satis-takibi/lead-form-dialog"
import { SetterSelect } from "@/components/mudur/satis-takibi/setter-select"
import { FollowUpList, type FollowUpItem } from "@/components/mudur/satis-takibi/follow-up-list"
import {
  DURUM_COLORS,
  DURUM_LABEL,
  DURUM_OPTIONS,
  DURUM_VALUES,
  KAPALI_DURUMLAR,
  KURUM_TIPI_LABEL,
  DEMO_DISPLAY,
  formatDemoDateTime,
  type Durum,
  type SalesLead,
  type RowDemo,
} from "@/lib/satis-takibi"
import { deleteLead, setDemoAppointmentSetter } from "@/app/mudur/satis-takibi/actions"

const ALL = "__all__"

type SetterOption = { id: string; name: string; count: number }

export function SatisTakibiView({
  leads,
  rowDemoByLead = {},
  followUpItems = [],
  setterOptions = [],
}: {
  leads: SalesLead[]
  rowDemoByLead?: Record<string, RowDemo>
  followUpItems?: FollowUpItem[]
  setterOptions?: SetterOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [durumFilter, setDurumFilter] = useState<string>(ALL)
  const [ilFilter, setIlFilter] = useState<string>(ALL)
  const [setterFilter, setSetterFilter] = useState<string>(ALL)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SalesLead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalesLead | null>(null)

  const todayIso = isoDate(new Date())

  // Durum başına sayaç (funnel).
  const durumCounts = useMemo(() => {
    const counts = {} as Record<Durum, number>
    for (const d of DURUM_VALUES) counts[d] = 0
    for (const l of leads) {
      const d = l.durum as Durum
      if (d in counts) counts[d] += 1
    }
    return counts
  }, [leads])

  // İl filtresi için mevcut iller.
  const iller = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) if (l.il) set.add(l.il)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"))
  }, [leads])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads.filter((l) => {
      if (q && !l.kurum_adi.toLowerCase().includes(q)) return false
      if (durumFilter !== ALL && l.durum !== durumFilter) return false
      if (ilFilter !== ALL && l.il !== ilFilter) return false
      // Ayarlayan filtresi: satır demosunu bu kişi ayarlamış kurumlar
      if (setterFilter !== ALL && rowDemoByLead[l.id]?.setById !== setterFilter) return false
      return true
    })
  }, [leads, query, durumFilter, ilFilter, setterFilter, rowDemoByLead])

  // SetterSelect için sade {id,name} listesi (count alanı olmadan)
  const setterSelectOptions = useMemo(
    () => setterOptions.map((s) => ({ id: s.id, name: s.name })),
    [setterOptions],
  )

  // Satır demosunun ayarlayanını inline değiştir (o satırın aktif/en güncel demosu)
  function handleRowSetter(demoId: string, setterId: string | null) {
    startTransition(async () => {
      const res = await setDemoAppointmentSetter(demoId, setterId)
      if (res.success) toast.success("Ayarlayan güncellendi.")
      else toast.error(res.error ?? "Güncellenemedi.")
    })
  }

  function openNew() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(lead: SalesLead) {
    setEditTarget(lead)
    setFormOpen(true)
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteLead(deleteTarget.id)
      if (result.success) {
        toast.success("Kurum silindi.")
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
          <h1 className="text-2xl font-bold text-zinc-900">Satış Takibi</h1>
          <p className="text-sm text-zinc-500 mt-1">
            İletişime geçilen kurumlar — {leads.length} kayıt
          </p>
        </div>
        <Button className="bg-[#1B6B8A] hover:bg-[#155a75]" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Kurum Ekle
        </Button>
      </div>

      {/* Funnel özet */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {DURUM_VALUES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDurumFilter((prev) => (prev === d ? ALL : d))}
            className={cn(
              "text-left bg-white border rounded-xl p-3 transition-all hover:shadow-sm",
              durumFilter === d ? "border-[#1B6B8A] ring-1 ring-[#1B6B8A]" : "border-zinc-200",
            )}
          >
            <div
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold mb-2",
                DURUM_COLORS[d],
              )}
            >
              {DURUM_LABEL[d]}
            </div>
            <div className="text-2xl font-bold text-zinc-900 tabular-nums">
              {durumCounts[d]}
            </div>
          </button>
        ))}
      </div>

      {/* Takip edilmesi gerekenler — demo yaşam döngüsüne göre */}
      <FollowUpList items={followUpItems} setters={setterOptions} />

      {/* Filtreler */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Kurum adı ile ara..."
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

        <Select value={durumFilter} onValueChange={setDurumFilter}>
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm durumlar</SelectItem>
            {DURUM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ilFilter} onValueChange={setIlFilter}>
          <SelectTrigger className="md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm iller</SelectItem>
            {iller.map((il) => (
              <SelectItem key={il} value={il}>
                {il}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {setterOptions.length > 0 && (
          <Select value={setterFilter} onValueChange={setSetterFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Ayarlayan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm ayarlayanlar</SelectItem>
              {setterOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Henüz kurum yok"
          description="İletişime geçtiğiniz ilk kurumu ekleyerek satış takibine başlayın."
          action={{ label: "Yeni Kurum Ekle", onClick: openNew }}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Filtreyle eşleşen kurum bulunamadı.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurum</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>İl</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Demo / Ayarlayan</TableHead>
                <TableHead className="text-right">Öğrenci</TableHead>
                <TableHead>Son Temas</TableHead>
                <TableHead>Sonraki Adım</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const overdue =
                  l.sonraki_adim_tarihi != null &&
                  l.sonraki_adim_tarihi <= todayIso &&
                  !KAPALI_DURUMLAR.includes(l.durum as Durum)
                return (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(l)}
                  >
                    <TableCell>
                      <div className="font-medium text-zinc-900">{l.kurum_adi}</div>
                      {l.iletisim_kisisi && (
                        <div className="text-xs text-zinc-500">{l.iletisim_kisisi}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-600 whitespace-nowrap">
                      {KURUM_TIPI_LABEL[l.kurum_tipi as keyof typeof KURUM_TIPI_LABEL] ?? l.kurum_tipi}
                    </TableCell>
                    <TableCell className="text-zinc-600">{l.il ?? "—"}</TableCell>
                    <TableCell>
                      <DurumBadge durum={l.durum as Durum} />
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const rd = rowDemoByLead[l.id]
                        if (!rd) {
                          return (
                            <Link
                              href={`/mudur/satis-takibi/${l.id}`}
                              className="text-xs font-medium text-[#1B6B8A] hover:underline"
                            >
                              + Demo ekle
                            </Link>
                          )
                        }
                        const disp = DEMO_DISPLAY[rd.displayKey]
                        // Ayarlayan soft-inactive olsa bile adı seçicide görünsün
                        const rowSetters =
                          rd.setById && rd.setterName && !setterSelectOptions.some((s) => s.id === rd.setById)
                            ? [...setterSelectOptions, { id: rd.setById, name: rd.setterName }]
                            : setterSelectOptions
                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  disp.color,
                                )}
                              >
                                {disp.label}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                <CalendarClock className="w-3 h-3" />
                                {formatDemoDateTime(rd.scheduledAt)}
                              </span>
                            </div>
                            <div className="w-44">
                              <SetterSelect
                                setters={rowSetters}
                                value={rd.setById}
                                onChange={(id) => handleRowSetter(rd.id, id)}
                                size="sm"
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right text-zinc-600 tabular-nums">
                      {l.ogrenci_sayisi ?? "—"}
                    </TableCell>
                    <TableCell className="text-zinc-600 whitespace-nowrap">
                      {l.son_temas_tarihi ? formatDate(l.son_temas_tarihi, "dd.MM.yyyy") : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {l.sonraki_adim_tarihi ? (
                        <span
                          className={cn(
                            "text-sm",
                            overdue ? "font-semibold text-[#F97316]" : "text-zinc-600",
                          )}
                        >
                          {formatDate(l.sonraki_adim_tarihi, "dd.MM.yyyy")}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/mudur/satis-takibi/${l.id}`}>Demo Randevuları</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(l)}>
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(l)}
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

      <LeadFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditTarget(null)
        }}
        lead={editTarget}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kurumu sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.kurum_adi}</span> kalıcı
              olarak silinecek. Bu işlem geri alınamaz.
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
