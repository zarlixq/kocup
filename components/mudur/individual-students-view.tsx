"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Download, ListChecks, MailCheck, MoreHorizontal, PencilLine, RotateCcw, Search, SlidersHorizontal, UserPlus, UserRound, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ComplianceBadge } from "@/components/analytics/compliance-badge"
import { ActiveStudentsArea } from "@/components/charts/active-students-area"
import { StatsCard } from "@/components/mudur/stats-card"
import {
  applyFilters,
  dailySignups,
  DIRECT_UTM,
  isActive,
  SOURCE_LABEL,
  summarize,
  utmBreakdown,
  utmKey,
  type IndividualFilters,
  type IndividualStudentRow,
} from "@/lib/bireysel/overview"
import { ALAN_LABEL, type Alan } from "@/lib/upplan/profile"
import { formatDateTimeTr, formatDateTr } from "@/lib/bireysel/format"
import { downloadCsv, toCsv } from "@/lib/csv-download"
import { INDIVIDUAL_LIST_DEFAULTS, type IndividualListColumns, type IndividualListPrefs } from "@/lib/analytics/ui-preferences"
import { saveUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { assignIndividualStudent } from "@/app/mudur/ogrenciler/actions"

type Option = { id: string; name: string }
type CoachOption = Option & { organization_id: string | null }

const ALL = "__all__"
const NONE = "__none__"

const COLUMN_LABELS: { key: keyof IndividualListColumns; label: string }[] = [
  { key: "created", label: "Kayıt tarihi" },
  { key: "source", label: "Geliş yolu" },
  { key: "utm", label: "UTM kaynağı" },
  { key: "segment", label: "Segment / alan" },
  { key: "verified", label: "E-posta doğrulandı" },
  { key: "setup", label: "UpPlan kurulumu" },
  { key: "lastLogin", label: "Son giriş" },
  { key: "sessions7d", label: "Son 7 gün soru kaydı" },
  { key: "compliance", label: "Haftalık uyum" },
]

function pct(v: number | null) {
  return v === null ? "—" : `%${v}`
}

function segmentLabel(r: IndividualStudentRow) {
  const seg = r.segment ? r.segment.toUpperCase() : "—"
  const alan = r.alan && r.alan in ALAN_LABEL ? ALAN_LABEL[r.alan as Alan] : null
  return alan ? `${seg} · ${alan}` : seg
}

function YesNo({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <Badge variant="outline" className={ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500"}>
      {ok ? yes : no}
    </Badge>
  )
}

export function IndividualStudentsView({
  students,
  organizations,
  coaches,
  initialPrefs = INDIVIDUAL_LIST_DEFAULTS,
  funnel,
}: {
  students: IndividualStudentRow[]
  organizations: Option[]
  coaches: CoachOption[]
  initialPrefs?: IndividualListPrefs
  /** Kampanya hunisi kartı (sunucuda hazırlanır). */
  funnel?: React.ReactNode
}) {
  const [, startSave] = useTransition()
  const [columns, setColumns] = useState<IndividualListColumns>(initialPrefs.columns)
  const [filters, setFilters] = useState<IndividualFilters>({ query: "", ...initialPrefs.filters } as IndividualFilters)
  const [assignTarget, setAssignTarget] = useState<IndividualStudentRow | null>(null)

  const summary = useMemo(() => summarize(students), [students])
  const utmRows = useMemo(() => utmBreakdown(students), [students])
  const daily = useMemo(() => dailySignups(students, 30), [students])
  const utmOptions = useMemo(() => Array.from(new Set(students.map(utmKey))).sort(), [students])
  const filtered = useMemo(() => applyFilters(students, filters), [students, filters])

  function persist(next: { columns?: IndividualListColumns; filters?: IndividualFilters }) {
    const f = next.filters ?? filters
    const payload: IndividualListPrefs = {
      columns: next.columns ?? columns,
      filters: { source: f.source, utm: f.utm, from: f.from, to: f.to, setup: f.setup, activity: f.activity },
    }
    startSave(async () => {
      const res = await saveUiPreference("mudur_individual_list", payload as unknown as Record<string, unknown>)
      if (!res.success) toast.error(res.error ?? "Tercih kaydedilemedi.")
    })
  }

  function setFilter<K extends keyof IndividualFilters>(key: K, value: IndividualFilters[K]) {
    const next = { ...filters, [key]: value }
    setFilters(next)
    if (key !== "query") persist({ filters: next })
  }

  function toggleColumn(key: keyof IndividualListColumns, checked: boolean) {
    const next = { ...columns, [key]: checked }
    setColumns(next)
    persist({ columns: next })
  }

  function exportCsv() {
    downloadCsv(
      toCsv(
        ["ad_soyad", "email", "kayit_tarihi", "gelis_yolu", "utm_source", "utm_medium", "utm_campaign", "segment", "alan", "sinif",
          "eposta_dogrulandi", "upplan_kurulumu", "son_giris", "son7gun_soru_kaydi", "ilk_soru_kaydi", "aktif", "haftalik_uyum"],
        filtered.map((r) => [
          r.full_name, r.email, formatDateTr(r.created_at), r.source ? SOURCE_LABEL[r.source] : SOURCE_LABEL.diger,
          r.utm_source, r.utm_medium, r.utm_campaign, r.segment, r.alan, r.grade,
          r.email_confirmed ? "evet" : "hayir", r.upplan_completed ? "tamamlandi" : "tamamlanmadi",
          formatDateTimeTr(r.last_sign_in_at), r.sessions_7d, r.first_session_date ? formatDateTr(r.first_session_date) : "",
          isActive(r) ? "aktif" : "pasif", r.compliance_percent ?? "",
        ]),
      ),
      `bireysel-ogrenciler-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  const filtersActive =
    filters.query || filters.source !== ALL || filters.utm !== ALL || filters.from || filters.to || filters.setup !== ALL || filters.activity !== ALL

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bireysel Öğrenciler</h1>
          <p className="mt-1 text-sm text-zinc-500">Kurumu ve koçu olmayan öğrenciler (ücretsiz kayıt ve davet).</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> CSV dışa aktar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard icon={Users} title="Toplam bireysel öğrenci" value={summary.total} />
        <StatsCard icon={UserPlus} title="Yeni kayıt (bugün / bu hafta)" value={`${summary.newToday} / ${summary.newThisWeek}`} color="orange" />
        <StatsCard icon={MailCheck} title="E-posta doğrulama oranı" value={pct(summary.verifiedRate)} color="green" />
        <StatsCard icon={ListChecks} title="UpPlan kurulum oranı" value={pct(summary.setupRate)} color="purple" />
        <StatsCard icon={PencilLine} title="İlk soru kaydını giren" value={pct(summary.firstSessionRate)} />
        <StatsCard
          icon={RotateCcw}
          title="7. gün geri dönen"
          value={pct(summary.d7Rate)}
          subtitle={`${summary.d7Eligible} öğrenci ölçülebilir (kayıt ≥ 7 gün)`}
          color="orange"
        />
      </div>

      {funnel}

      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveStudentsArea data={daily} title="Günlük kayıt — son 30 gün" emptyText="Son 30 günde kayıt yok" height={220} />
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">UTM kaynağına göre</h3>
          {utmRows.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz veri yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kaynak</TableHead>
                    <TableHead className="text-right">Kayıt</TableHead>
                    <TableHead className="text-right">Doğrulama</TableHead>
                    <TableHead className="text-right">Kurulum</TableHead>
                    <TableHead className="text-right">İlk soru</TableHead>
                    <TableHead className="text-right">Aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utmRows.map((u) => (
                    <TableRow key={u.source}>
                      <TableCell className={u.source === DIRECT_UTM ? "text-zinc-500" : "font-medium"}>{u.source}</TableCell>
                      <TableCell className="text-right">{u.count}</TableCell>
                      <TableCell className="text-right">{pct(u.verifiedRate)}</TableCell>
                      <TableCell className="text-right">{pct(u.setupRate)}</TableCell>
                      <TableCell className="text-right">{pct(u.firstSessionRate)}</TableCell>
                      <TableCell className="text-right">{u.activeCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input placeholder="Ad veya e-posta ile ara..." value={filters.query} onChange={(e) => setFilter("query", e.target.value)} className="pl-9" />
          </div>
          <Select value={filters.source} onValueChange={(v) => setFilter("source", v as IndividualFilters["source"])}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm geliş yolları</SelectItem>
              <SelectItem value="ucretsiz_kayit">{SOURCE_LABEL.ucretsiz_kayit}</SelectItem>
              <SelectItem value="davet">{SOURCE_LABEL.davet}</SelectItem>
              <SelectItem value="diger">{SOURCE_LABEL.diger}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.utm} onValueChange={(v) => setFilter("utm", v)}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm UTM kaynakları</SelectItem>
              {utmOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label htmlFor="from" className="text-xs text-zinc-500">Kayıt başlangıç</Label>
              <Input id="from" type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="md:w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to" className="text-xs text-zinc-500">Kayıt bitiş</Label>
              <Input id="to" type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="md:w-40" />
            </div>
          </div>
          <Select value={filters.setup} onValueChange={(v) => setFilter("setup", v as IndividualFilters["setup"])}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm kurulum durumları</SelectItem>
              <SelectItem value="tamam">Kurulum tamamlandı</SelectItem>
              <SelectItem value="eksik">Kurulum tamamlanmadı</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.activity} onValueChange={(v) => setFilter("activity", v as IndividualFilters["activity"])}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Aktif + pasif</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="pasif">Pasif (7 gün)</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><SlidersHorizontal className="h-4 w-4" /> Görünürlük</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Görünen kolonlar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMN_LABELS.map((c) => (
                <DropdownMenuCheckboxItem key={c.key} checked={columns[c.key]} onCheckedChange={(v) => toggleColumn(c.key, !!v)} onSelect={(e) => e.preventDefault()}>
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                const next = { query: "", ...INDIVIDUAL_LIST_DEFAULTS.filters } as IndividualFilters
                setFilters(next)
                persist({ filters: next })
              }}
            >
              <X className="h-4 w-4" /> Temizle
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500">{filtered.length} / {students.length} öğrenci · Pasif: son 7 günde giriş veya soru kaydı yok.</p>
      </div>

      {students.length === 0 ? (
        <EmptyState icon={UserRound} title="Henüz bireysel öğrenci yok" description="Ücretsiz kayıt veya davetle gelen öğrenciler burada listelenir." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">Filtreyle eşleşen öğrenci yok.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                {columns.created && <TableHead>Kayıt</TableHead>}
                {columns.source && <TableHead>Geliş yolu</TableHead>}
                {columns.utm && <TableHead>UTM</TableHead>}
                {columns.segment && <TableHead>Segment / alan</TableHead>}
                {columns.verified && <TableHead>E-posta</TableHead>}
                {columns.setup && <TableHead>UpPlan</TableHead>}
                {columns.lastLogin && <TableHead>Son giriş</TableHead>}
                {columns.sessions7d && <TableHead className="text-right">7 gün kayıt</TableHead>}
                {columns.compliance && <TableHead>Uyum</TableHead>}
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className={isActive(r) ? undefined : "bg-zinc-50/60"}>
                  <TableCell>
                    <Link href={`/mudur/ogrenciler/${r.id}`} className="hover:opacity-80">
                      <div className="font-medium text-zinc-900">{r.full_name}</div>
                      <div className="text-xs text-zinc-500">{r.email}</div>
                    </Link>
                  </TableCell>
                  {columns.created && <TableCell className="text-sm text-zinc-600">{formatDateTr(r.created_at)}</TableCell>}
                  {columns.source && <TableCell className="text-sm text-zinc-600">{r.source ? SOURCE_LABEL[r.source] : SOURCE_LABEL.diger}</TableCell>}
                  {columns.utm && (
                    <TableCell className="text-sm text-zinc-600">
                      {r.utm_source ?? "—"}
                      {r.utm_campaign && <div className="text-xs text-zinc-400">{r.utm_campaign}</div>}
                    </TableCell>
                  )}
                  {columns.segment && <TableCell className="text-sm text-zinc-600">{segmentLabel(r)}</TableCell>}
                  {columns.verified && <TableCell><YesNo ok={r.email_confirmed} yes="Doğrulandı" no="Bekliyor" /></TableCell>}
                  {columns.setup && <TableCell><YesNo ok={r.upplan_completed} yes="Tamamlandı" no="Eksik" /></TableCell>}
                  {columns.lastLogin && <TableCell className="text-sm text-zinc-600">{formatDateTimeTr(r.last_sign_in_at)}</TableCell>}
                  {columns.sessions7d && <TableCell className="text-right text-sm">{r.sessions_7d}</TableCell>}
                  {columns.compliance && <TableCell><ComplianceBadge percent={r.compliance_percent} /></TableCell>}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="İşlemler"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/mudur/ogrenciler/${r.id}`}>Detay</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignTarget(r)}>Koç ata / kuruma bağla</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {assignTarget && (
        <AssignIndividualDialog
          student={assignTarget}
          organizations={organizations}
          coaches={coaches}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}

function AssignIndividualDialog({
  student,
  organizations,
  coaches,
  onClose,
}: {
  student: IndividualStudentRow
  organizations: Option[]
  coaches: CoachOption[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [orgId, setOrgId] = useState<string>(NONE)
  const [coachId, setCoachId] = useState<string>(NONE)
  const org = orgId === NONE ? null : orgId
  const coachOptions = coaches.filter((c) => c.organization_id === org)

  function submit() {
    const coach = coachId === NONE ? null : coachId
    if (!org && !coach) {
      toast.error("Kurum veya koç seçin.")
      return
    }
    startTransition(async () => {
      const res = await assignIndividualStudent(student.id, org, coach)
      if (res.success) {
        toast.success("Öğrenci bireysel listeden çıkarıldı.")
        onClose()
      } else {
        toast.error(res.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koç ata / kuruma bağla</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{student.full_name}</span> bir koça veya kuruma bağlanınca bireysel listeden çıkar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kurum</Label>
            <Select value={orgId} onValueChange={(v) => { setOrgId(v); setCoachId(NONE) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Kurum yok</SelectItem>
                {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Koç</Label>
            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Koç yok</SelectItem>
                {coachOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">{org ? "Yalnız seçilen kurumun koçları." : "Kurumsuz (bağımsız) koçlar."}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Vazgeç</Button>
          <Button onClick={submit} disabled={pending} className="bg-[#1B6B8A] hover:bg-[#155a75]">{pending ? "Kaydediliyor..." : "Kaydet"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
