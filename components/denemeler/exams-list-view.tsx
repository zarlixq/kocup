"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Filter, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { EXAM_TYPE_LABEL } from "@/lib/assignments/constants"

export type ExamListItem = {
  id: string
  student_id: string
  student_name: string
  name: string
  exam_type: string
  date: string
  toplam_net: number
  siralama: number | null
  detail_href: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

type TypeFilter = "all" | "tyt" | "ayt" | "tyt_ayt" | "lgs" | "okul"

export function ExamsListView({
  exams,
  students,
  showStudent = true,
}: {
  exams: ExamListItem[]
  students: Array<{ id: string; full_name: string }>
  showStudent?: boolean
}) {
  const [studentFilter, setStudentFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

  const filtered = useMemo(
    () =>
      exams.filter((e) => {
        if (studentFilter !== "all" && e.student_id !== studentFilter) return false
        if (typeFilter !== "all" && e.exam_type !== typeFilter) return false
        if (fromDate && e.date < fromDate) return false
        if (toDate && e.date > toDate) return false
        return true
      }),
    [exams, studentFilter, typeFilter, fromDate, toDate],
  )

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <Filter className="h-3.5 w-3.5" /> Filtreler
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className="text-xs text-zinc-500 mb-1 block">Tip</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hepsi</SelectItem>
                <SelectItem value="tyt">TYT</SelectItem>
                <SelectItem value="ayt">AYT</SelectItem>
                <SelectItem value="tyt_ayt">TYT + AYT</SelectItem>
                <SelectItem value="lgs">LGS</SelectItem>
                <SelectItem value="okul">Okul</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Başlangıç</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Bitiş</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          {exams.length === 0
            ? "Henüz deneme kaydı yok 📝"
            : "Bu filtreyle eşleşen deneme yok."}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                {showStudent && <TableHead>Öğrenci</TableHead>}
                <TableHead>Deneme</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Sıralama</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDate(e.date)}</TableCell>
                  {showStudent && (
                    <TableCell>
                      <Link
                        href={`/koc/ogrenciler/${e.student_id}`}
                        className="font-medium text-zinc-900 hover:text-[#1B6B8A]"
                      >
                        {e.student_name}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-zinc-900">{e.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {EXAM_TYPE_LABEL[e.exam_type] ?? e.exam_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {e.toplam_net.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-600">
                    {e.siralama ? e.siralama.toLocaleString("tr-TR") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={e.detail_href}
                      className="inline-flex items-center gap-1 text-xs text-[#1B6B8A] hover:underline"
                    >
                      Detay <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
