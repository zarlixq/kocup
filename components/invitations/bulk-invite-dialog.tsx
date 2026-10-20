"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Download, FileSpreadsheet, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { parseImportCsv, IMPORT_TEMPLATE_CSV, type ImportRowData } from "@/lib/import/csv"
import { bulkInvitationChunkAction, type BulkRowResult } from "@/lib/invitations/actions"
import { downloadCsv, toCsv } from "@/lib/csv-download"
import type { InviteCoachOption, InviteOption } from "@/components/invitations/invite-dialog"

// Toplu davet — mevcut öğrenci import CSV formatını (lib/import/csv) yeniden kullanır.
// Satırlar 10'arlı parçalarla sırayla gönderilir (sunucu zaman aşımı + e-posta hız sınırı).

const NONE = "__none__"
const CHUNK = 10
const MAX_ROWS = 500

function segmentFor(row: ImportRowData): "yks" | "lgs" {
  if (row.segment === "lgs" || row.segment === "yks") return row.segment
  return row.grade && ["5", "6", "7", "8"].includes(row.grade) ? "lgs" : "yks"
}

type Props = { organizations: InviteOption[]; coaches: InviteCoachOption[]; lockedOrgId?: string | null }

export function BulkInviteDialog({ organizations, coaches, lockedOrgId = null }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ImportRowData[]>([])
  const [invalid, setInvalid] = useState<{ index: number; error: string }[]>([])
  const [orgId, setOrgId] = useState<string>(lockedOrgId ?? NONE)
  const [coachId, setCoachId] = useState<string>(NONE)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<BulkRowResult[]>([])

  const effectiveOrg = lockedOrgId ?? (orgId === NONE ? null : orgId)
  const coachOptions = coaches.filter((c) => c.organization_id === effectiveOrg)

  function reset() {
    setRows([])
    setInvalid([])
    setResults([])
    setOrgId(lockedOrgId ?? NONE)
    setCoachId(NONE)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleFile(file: File) {
    const { rows: parsed, headerError } = parseImportCsv(await file.text())
    if (headerError) {
      toast.error(headerError)
      return
    }
    const ok = parsed.filter((r) => r.ok).map((r) => (r as { data: ImportRowData }).data)
    if (ok.length > MAX_ROWS) {
      toast.error(`En fazla ${MAX_ROWS} satır; dosyayı bölün.`)
      return
    }
    setRows(ok)
    setInvalid(parsed.filter((r) => !r.ok).map((r) => ({ index: r.index, error: (r as { error: string }).error })))
    setResults([])
  }

  async function run() {
    setRunning(true)
    const all: BulkRowResult[] = []
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK).map((r) => ({
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        segment: segmentFor(r),
        grade: r.grade,
        organization_id: effectiveOrg,
        coach_id: coachId === NONE ? null : coachId,
      }))
      const res = await bulkInvitationChunkAction(chunk)
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Gönderim durdu.")
        break
      }
      all.push(...res.data)
      setResults([...all])
    }
    setRunning(false)
    const okCount = all.filter((r) => r.ok).length
    toast.success(`${okCount} davet oluşturuldu, ${all.length - okCount} hatalı.`)
  }

  function exportResults() {
    downloadCsv(
      toCsv(
        ["ad_soyad", "email", "durum", "hata", "davet_baglantisi", "eposta_gonderildi"],
        results.map((r) => [r.full_name, r.email, r.ok ? "olusturuldu" : "hata", r.error ?? "", r.link ?? "", r.ok ? (r.emailed ? "evet" : "hayir") : ""]),
      ),
      "davet-sonuclari.csv",
    )
  }

  const done = results.length > 0 && !running

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (running) return
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4" />
          Toplu davet (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Toplu öğrenci daveti</DialogTitle>
          <DialogDescription>
            Öğrenci import şablonuyla aynı CSV: en az ad_soyad ve email; sinif (zorunlu), segment, telefon opsiyonel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="px-0 text-[#1B6B8A]" onClick={() => downloadCsv(IMPORT_TEMPLATE_CSV, "ogrenci-davet-sablon.csv")}>
            <Download className="h-4 w-4" /> Şablonu indir
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={running}
          />

          {rows.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {!lockedOrgId && (
                <div className="space-y-1.5">
                  <Label>Kurum (tüm satırlar)</Label>
                  <Select value={orgId} onValueChange={(v) => { setOrgId(v); setCoachId(NONE) }} disabled={running || done}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Kurum yok (bireysel)</SelectItem>
                      {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Koç (tüm satırlar)</Label>
                <Select value={coachId} onValueChange={setCoachId} disabled={running || done}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Koç yok</SelectItem>
                    {coachOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(rows.length > 0 || invalid.length > 0) && (
            <div className="rounded-lg border border-zinc-200 p-3 text-sm">
              <p><span className="font-medium">{rows.length}</span> geçerli satır{invalid.length > 0 && <>, <span className="font-medium text-red-600">{invalid.length}</span> hatalı satır (atlanacak)</>}</p>
              {invalid.slice(0, 5).map((r) => (
                <p key={r.index} className="text-xs text-red-600">Satır {r.index + 1}: {r.error}</p>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full bg-[#1B6B8A] transition-all" style={{ width: `${Math.round((results.length / rows.length) * 100)}%` }} />
              </div>
              <p className="text-xs text-zinc-600">
                {results.length}/{rows.length} işlendi · {results.filter((r) => r.ok).length} başarılı
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {results.filter((r) => !r.ok).map((r) => (
                  <li key={r.email} className="text-red-600">{r.email}: {r.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {done && (
              <Button variant="outline" onClick={exportResults}>
                <Download className="h-4 w-4" /> Sonuçları indir (bağlantılar dahil)
              </Button>
            )}
            {!done && (
              <Button onClick={run} disabled={running || rows.length === 0} className="bg-[#1B6B8A] hover:bg-[#155a75]">
                <Upload className="h-4 w-4" />
                {running ? "Gönderiliyor..." : `${rows.length} davet gönder`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
