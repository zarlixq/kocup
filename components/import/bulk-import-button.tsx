"use client"

import { useRef, useState } from "react"
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  parseImportCsv,
  IMPORT_TEMPLATE_CSV,
  IMPORT_TEMPLATE_FILENAME,
  type ImportRowData,
  type ParsedRow,
} from "@/lib/import/csv"
import {
  createImportJob,
  processNextChunk,
  getImportJob,
  getImportPasswordList,
  type ImportErrorRow,
} from "@/lib/import/actions"

type Progress = {
  id: string
  total: number
  processed: number
  succeeded: number
  failed: number
  status: string
}

type Phase = "select" | "preview" | "running" | "done"

/** Geçici şifreli kurum importu (müdür kurum detayından). Verilirse şifre modu açılır. */
export type PasswordImportConfig = {
  orgId: string
  coaches: { id: string; full_name: string }[]
}

function csvCell(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkImportButton({
  activeJob,
  passwordImport,
}: {
  activeJob?: { jobId: string; progress: Progress } | null
  passwordImport?: PasswordImportConfig
}) {
  const isPassword = Boolean(passwordImport)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>(activeJob ? "running" : "select")
  const [filename, setFilename] = useState("")
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [progress, setProgress] = useState<Progress | null>(activeJob?.progress ?? null)
  const [errors, setErrors] = useState<ImportErrorRow[]>([])
  const [running, setRunning] = useState(false)
  // Şifre modu state'i
  const [coachId, setCoachId] = useState<string>("")
  const [pwMode, setPwMode] = useState<"common" | "random">("random")
  const [commonPwd, setCommonPwd] = useState("")
  const stopRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const valid = parsed.filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok)
  const invalid = parsed.filter((r): r is Extract<ParsedRow, { ok: false }> => !r.ok)

  function downloadTemplate() {
    downloadCsv(IMPORT_TEMPLATE_CSV, IMPORT_TEMPLATE_FILENAME)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFilename(file.name)
    const text = await file.text()
    const result = parseImportCsv(text)
    if (result.headerError) {
      toast.error(result.headerError)
      setParsed([])
      return
    }
    setParsed(result.rows)
    setPhase("preview")
  }

  async function runLoop(jobId: string) {
    setRunning(true)
    setPhase("running")
    stopRef.current = false
    let done = false
    while (!done) {
      if (stopRef.current) break
      const res = await processNextChunk(jobId)
      if (!res.ok) {
        toast.error(res.error)
        break
      }
      setProgress(res.progress)
      done = res.done
    }
    if (done) {
      const detail = await getImportJob(jobId)
      if (detail.ok) {
        setProgress(detail.progress)
        setErrors(detail.errors)
      }
      setPhase("done")
      toast.success("İçe aktarma tamamlandı.")
    }
    setRunning(false)
  }

  async function start() {
    const rows: ImportRowData[] = valid.map((r) => r.data)
    if (rows.length === 0) {
      toast.error("İçe aktarılacak geçerli kayıt yok.")
      return
    }
    if (isPassword) {
      if (!coachId) {
        toast.error("Önce bir koç seçin.")
        return
      }
      if (pwMode === "common" && commonPwd.trim().length < 6) {
        toast.error("Ortak şifre en az 6 karakter olmalı.")
        return
      }
    }

    const res = await createImportJob(
      isPassword
        ? {
            filename,
            rows,
            mode: "password",
            targetOrgId: passwordImport!.orgId,
            coachId,
            commonPassword: pwMode === "common" ? commonPwd.trim() : null,
          }
        : { filename, rows },
    )
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    await runLoop(res.jobId)
  }

  async function downloadPasswordList() {
    if (!progress) return
    const res = await getImportPasswordList(progress.id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    const header = "ad_soyad,email,gecici_sifre\n"
    const body = res.rows
      .map((r) => `${csvCell(r.full_name)},${csvCell(r.email)},${csvCell(r.password)}`)
      .join("\n")
    downloadCsv(header + body, "ogrenci-gecici-sifreler.csv")
  }

  function reset() {
    setPhase("select")
    setParsed([])
    setFilename("")
    setProgress(null)
    setErrors([])
    if (fileRef.current) fileRef.current.value = ""
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  const actionVerb = isPassword ? "oluştur" : "davet et"

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Toplu İçe Aktar
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (running) return
          setOpen(o)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Toplu Öğrenci İçe Aktarma</DialogTitle>
            <DialogDescription>
              {isPassword
                ? "Geçici şifreyle hesap oluşturulur (mail gönderilmez); öğrenci ilk girişte şifresini değiştirir."
                : "CSV dosyasıyla çok sayıda öğrenciyi davet et."}{" "}
              Excel kullanıyorsan &ldquo;CSV olarak kaydet&rdquo; ile dışa aktar.
            </DialogDescription>
          </DialogHeader>

          {phase === "select" && (
            <div className="space-y-4">
              {isPassword && passwordImport && (
                <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="import-coach">Koç *</Label>
                    <Select value={coachId} onValueChange={setCoachId}>
                      <SelectTrigger id="import-coach">
                        <SelectValue placeholder="Öğrencilerin atanacağı koç" />
                      </SelectTrigger>
                      <SelectContent>
                        {passwordImport.coaches.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-zinc-500">Önce kuruma koç ekleyin.</div>
                        ) : (
                          passwordImport.coaches.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Şifre Modu</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPwMode("random")}
                        className={`rounded-lg border px-3 py-2 text-left text-xs ${pwMode === "random" ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200"}`}
                      >
                        <span className="font-medium block">Rastgele</span>
                        Her öğrenciye özel şifre; liste indirilir.
                      </button>
                      <button
                        type="button"
                        onClick={() => setPwMode("common")}
                        className={`rounded-lg border px-3 py-2 text-left text-xs ${pwMode === "common" ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200"}`}
                      >
                        <span className="font-medium block">Ortak</span>
                        Herkese aynı başlangıç şifresi.
                      </button>
                    </div>
                    {pwMode === "common" && (
                      <Input
                        type="text"
                        value={commonPwd}
                        onChange={(e) => setCommonPwd(e.target.value)}
                        placeholder="Ortak başlangıç şifresi (min 6)"
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[#1B6B8A]">
                <Download className="h-4 w-4" /> Örnek şablonu indir
              </Button>
              <label className="block border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#1B6B8A]/40">
                <FileSpreadsheet className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                <span className="text-sm text-zinc-600">CSV dosyası seç</span>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
              </label>
              <p className="text-xs text-zinc-500">
                Beklenen sütunlar: <code>ad_soyad, email, sinif, segment, telefon, veli_adi,
                veli_telefon, okul</code>. Zorunlu: ad_soyad + email.
              </p>
            </div>
          )}

          {phase === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> {valid.length} geçerli
                </span>
                {invalid.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> {invalid.length} hatalı (atlanacak)
                  </span>
                )}
              </div>

              {invalid.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 text-xs">
                  {invalid.map((r) => (
                    <div key={r.index} className="flex justify-between gap-2 px-3 py-1.5 border-b border-zinc-100 last:border-0">
                      <span className="text-zinc-500">Satır {r.index + 1}</span>
                      <span className="text-amber-700 text-right">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>Geri</Button>
                <Button variant="accent" onClick={start} disabled={valid.length === 0}>
                  {valid.length} öğrenciyi {actionVerb}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                {isPassword
                  ? "Hesaplar hızlıca oluşturulur. Bu pencereyi açık tutun; kapanırsa kaldığı yerden devam edilebilir."
                  : "Davetler sırayla gönderilir; yüzlerce kayıt dakikalar sürebilir. Sayfa kapanırsa kaldığı yerden devam edebilirsiniz."}
              </p>
            </div>
          )}

          {(phase === "running" || phase === "done") && progress && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-900">
                    {progress.processed} / {progress.total}
                  </span>
                  <span className="text-zinc-500">%{pct}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full bg-[#1B6B8A] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-700">{progress.succeeded} başarılı</span>
                  <span className="text-red-600">{progress.failed} hatalı</span>
                </div>
              </div>

              {phase === "running" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">{running ? "İşleniyor..." : "Duraklatıldı"}</span>
                  {running ? (
                    <Button variant="outline" size="sm" onClick={() => { stopRef.current = true }}>
                      Duraklat
                    </Button>
                  ) : (
                    <Button variant="accent" size="sm" onClick={() => runLoop(progress.id)}>
                      Devam et
                    </Button>
                  )}
                </div>
              )}

              {phase === "done" && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Tamamlandı: {progress.succeeded}{" "}
                    {isPassword ? "hesap oluşturuldu" : "davet gönderildi"}
                    {progress.failed > 0 ? `, ${progress.failed} hata` : ""}.
                  </div>

                  {isPassword && pwMode === "random" && progress.succeeded > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <p className="text-xs text-amber-800">
                        Geçici şifreler bu listededir; <strong>güvenli paylaşın</strong>. Öğrenciler ilk
                        girişte şifrelerini değiştirecek.
                      </p>
                      <Button variant="accent" size="sm" onClick={downloadPasswordList}>
                        <KeyRound className="h-4 w-4" /> Şifre listesini indir (CSV)
                      </Button>
                    </div>
                  )}

                  {errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 text-xs">
                      {errors.map((e) => (
                        <div key={e.row_index} className="flex justify-between gap-2 px-3 py-1.5 border-b border-zinc-100 last:border-0">
                          <span className="text-zinc-700">{e.email}</span>
                          <span className="text-red-600 text-right">{e.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={reset}>Yeni İçe Aktarma</Button>
                    <Button variant="accent" onClick={() => setOpen(false)}>Kapat</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
