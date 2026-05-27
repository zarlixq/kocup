"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Layers, Filter, ExternalLink, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_VARIANT,
  deriveAssignmentStatus,
  progressBarColor,
  progressPercent,
  type AssignmentStatus,
  type DerivedAssignmentStatus,
} from "@/lib/assignments/constants"
import { AssignTopicDialog } from "@/components/konu-analizi/assign-topic-dialog"
import { BulkAssignDialog } from "@/components/konu-analizi/bulk-assign-dialog"
import { EditAssignmentDialog } from "@/components/konu-analizi/edit-assignment-dialog"

export type AssignmentRow = {
  id: string
  student_id: string
  student_name: string
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  hedef_soru: number
  hedef_sure_dk: number | null
  baslangic_tarihi: string
  son_tarih: string
  notes: string | null
  status: AssignmentStatus
  cozulen_soru: number
  dogru_sayisi: number
  toplam_sure_dk: number
}

type Student = { id: string; full_name: string; grade?: string | null }
type Subject = { id: string; name: string; exam_type?: string | null }
type Topic = { id: string; subject_id: string; name: string }
type TopicWithSubject = Topic & { subject_name: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

type StatusFilter = "all" | DerivedAssignmentStatus
type Props = {
  rows: AssignmentRow[]
  students: Student[]
  subjects: Subject[]
  topics: Topic[]
  showStudent?: boolean
  defaultStudentId?: string
  /** False ise atama/düzenleme butonları gizlenir (müdür mirror için) */
  canManage?: boolean
  /** Atama detayları için href base path (örn. /mudur/ogrenciler) */
  studentHrefBase?: string
}

export function KocKonuAnaliziView({
  rows,
  students,
  subjects,
  topics,
  showStudent = true,
  defaultStudentId,
  canManage = true,
  studentHrefBase = "/koc/ogrenciler",
}: Props) {
  const [studentFilter, setStudentFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [assignOpen, setAssignOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editRow, setEditRow] = useState<AssignmentRow | null>(null)

  const today = useMemo(() => new Date(), [])

  const topicsWithSubject = useMemo<TopicWithSubject[]>(() => {
    const subjMap = new Map(subjects.map((s) => [s.id, s.name]))
    return topics.map((t) => ({ ...t, subject_name: subjMap.get(t.subject_id) ?? "—" }))
  }, [subjects, topics])

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const derived = deriveAssignmentStatus(r.status, r.cozulen_soru, r.hedef_soru, r.son_tarih, today)
        const pct = progressPercent(r.cozulen_soru, r.hedef_soru)
        return { ...r, derived, pct }
      }),
    [rows, today],
  )

  const filtered = useMemo(
    () =>
      enriched.filter((r) => {
        if (studentFilter !== "all" && r.student_id !== studentFilter) return false
        if (subjectFilter !== "all" && r.subject_id !== subjectFilter) return false
        if (statusFilter !== "all" && r.derived !== statusFilter) return false
        return true
      }),
    [enriched, studentFilter, subjectFilter, statusFilter],
  )

  const counts = useMemo(() => {
    return enriched.reduce(
      (acc, r) => {
        acc.total++
        if (r.derived === "aktif") acc.aktif++
        else if (r.derived === "tamamlandi") acc.tamamlandi++
        else if (r.derived === "gecikti") acc.gecikti++
        else if (r.derived === "iptal") acc.iptal++
        return acc
      },
      { total: 0, aktif: 0, tamamlandi: 0, gecikti: 0, iptal: 0 },
    )
  }, [enriched])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Toplam Atama" value={counts.total} tone="navy" />
        <StatTile label="Aktif" value={counts.aktif} tone="cyan" />
        <StatTile label="Tamamlandı" value={counts.tamamlandi} tone="green" />
        <StatTile label="Gecikti" value={counts.gecikti} tone="red" />
      </div>

      {canManage && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Layers className="h-4 w-4" /> Toplu Ata
          </Button>
          <Button variant="accent" onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4" /> Konu Ata
          </Button>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <Filter className="h-3.5 w-3.5" /> Filtreler
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {showStudent && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Öğrenci</label>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hepsi</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Ders</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Durum</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                <SelectItem value="gecikti">Gecikti</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          {enriched.length === 0
            ? "Henüz konu atanmamış 📚 — sağ üstten ata."
            : "Bu filtreyle eşleşen atama yok."}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {showStudent && <TableHead>Öğrenci</TableHead>}
                <TableHead>Ders / Konu</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead className="w-44">İlerleme</TableHead>
                <TableHead>Son Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  {showStudent && (
                    <TableCell>
                      <Link
                        href={`${studentHrefBase}/${r.student_id}/konu-analizi`}
                        className="font-medium text-zinc-900 hover:text-[#1B6B8A]"
                      >
                        {r.student_name}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-xs text-zinc-500">{r.subject_name}</div>
                    <div className="font-medium text-zinc-900">{r.topic_name}</div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {r.cozulen_soru} / {r.hedef_soru}
                    {r.hedef_sure_dk && (
                      <div className="text-xs text-zinc-500">{r.hedef_sure_dk} dk hedef</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <ProgressBar pct={r.pct} color={progressBarColor(r.derived, r.pct)} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums whitespace-nowrap">
                    {formatDate(r.son_tarih)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ASSIGNMENT_STATUS_VARIANT[r.derived]}>
                      {ASSIGNMENT_STATUS_LABEL[r.derived]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManage && (
                          <DropdownMenuItem onClick={() => setEditRow(r)}>
                            Düzenle / Sil
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link
                            href={`${studentHrefBase}/${r.student_id}/konu-analizi`}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Öğrenci Analizi
                          </Link>
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

      {canManage && assignOpen && (
        <AssignTopicDialog
          open
          onOpenChange={setAssignOpen}
          students={students}
          subjects={subjects}
          topics={topics}
          defaultStudentId={defaultStudentId}
        />
      )}
      {canManage && bulkOpen && (
        <BulkAssignDialog
          open
          onOpenChange={setBulkOpen}
          students={students}
          subjects={subjects}
          topics={topicsWithSubject}
        />
      )}
      {canManage && editRow && (
        <EditAssignmentDialog
          open
          onOpenChange={(o) => !o && setEditRow(null)}
          assignment={{
            id: editRow.id,
            topic_name: editRow.topic_name,
            subject_name: editRow.subject_name,
            student_name: editRow.student_name,
            hedef_soru: editRow.hedef_soru,
            hedef_sure_dk: editRow.hedef_sure_dk,
            son_tarih: editRow.son_tarih,
            notes: editRow.notes,
            status: editRow.status,
          }}
        />
      )}
    </div>
  )
}

const TONES: Record<string, string> = {
  navy: "bg-cyan-50 text-[#1B6B8A]",
  cyan: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONES }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all motion-reduce:transition-none motion-reduce:transform-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${TONES[tone]}`}>
          {value}
        </span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-zinc-600 w-10 text-right">%{pct}</span>
    </div>
  )
}
