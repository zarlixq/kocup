"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  type KurumBasvuru,
  type KocBasvuru,
  type KurumStatus,
  type BasvuruStatus,
  KURUM_STATUS_OPTIONS,
  KURUM_STATUS_COLORS,
  BASVURU_STATUS_OPTIONS,
  BASVURU_STATUS_COLORS,
} from "@/lib/basvurular"
import { updateKurumStatus, updateKocStatus } from "@/app/mudur/talepler/actions"

type Props = {
  kurumBasvurular: KurumBasvuru[]
  kocBasvurular: KocBasvuru[]
}

type TabValue = "kurum" | "koc"

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Inline durum seçici ─────────────────────────────────────────────────────
function StatusSelect<T extends string>({
  value,
  options,
  colors,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  colors: Record<T, string>
  onChange: (v: T) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Select
      value={value}
      onValueChange={(v) => startTransition(() => onChange(v as T))}
      disabled={pending}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[160px] text-xs font-semibold border",
          colors[value],
          pending && "opacity-60",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Detay satırı ────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="col-span-2 text-zinc-900 break-words">{value}</span>
    </div>
  )
}

type DetailState =
  | { kind: "kurum"; row: KurumBasvuru }
  | { kind: "koc"; row: KocBasvuru }
  | null

function TabCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold bg-orange-500 text-white">
      {count}
    </span>
  )
}

export function TaleplerView({ kurumBasvurular, kocBasvurular }: Props) {
  const [tab, setTab] = useState<TabValue>("kurum")
  const [detail, setDetail] = useState<DetailState>(null)

  const yeniCounts = useMemo(
    () => ({
      kurum: kurumBasvurular.filter((r) => r.status === "yeni").length,
      koc: kocBasvurular.filter((r) => r.status === "yeni").length,
    }),
    [kurumBasvurular, kocBasvurular],
  )

  async function handleStatus(
    fn: (id: string, status: string) => Promise<{ success: boolean; error?: string }>,
    id: string,
    status: string,
  ) {
    const res = await fn(id, status)
    if (!res.success) {
      toast.error(res.error ?? "Durum güncellenemedi")
      return
    }
    toast.success("Durum güncellendi")
  }

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="mb-4">
          <TabsTrigger value="kurum" className="gap-2">
            Kurum Başvuruları
            <TabCountBadge count={yeniCounts.kurum} />
          </TabsTrigger>
          <TabsTrigger value="koc" className="gap-2">
            Koç Başvuruları
            <TabCountBadge count={yeniCounts.koc} />
          </TabsTrigger>
        </TabsList>

        {/* ── KURUM ─────────────────────────────────────────────────────── */}
        <TabsContent value="kurum" className="m-0">
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            {kurumBasvurular.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                Henüz kurum başvurusu yok.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurum</TableHead>
                    <TableHead>Yetkili</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Öğrenci / Koç</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kurumBasvurular.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => setDetail({ kind: "kurum", row: r })}
                      className={cn(
                        "cursor-pointer",
                        r.status === "yeni" && "bg-orange-50/40",
                      )}
                    >
                      <TableCell className="font-medium text-zinc-900">
                        {r.institution_name}
                      </TableCell>
                      <TableCell className="text-zinc-600">{r.full_name}</TableCell>
                      <TableCell className="text-zinc-600 tabular-nums">{r.phone}</TableCell>
                      <TableCell className="text-zinc-600 text-xs">
                        {r.student_count ?? "—"} / {r.coach_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-zinc-600">{formatDate(r.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StatusSelect<KurumStatus>
                          value={(r.status as KurumStatus) ?? "yeni"}
                          options={KURUM_STATUS_OPTIONS}
                          colors={KURUM_STATUS_COLORS}
                          onChange={(v) => handleStatus(updateKurumStatus, r.id, v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── KOÇ ───────────────────────────────────────────────────────── */}
        <TabsContent value="koc" className="m-0">
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            {kocBasvurular.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                Henüz koç başvurusu yok.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Branş</TableHead>
                    <TableHead>Deneyim</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kocBasvurular.map((r) => (
                    <TableRow
                      key={r.id}
                      onClick={() => setDetail({ kind: "koc", row: r })}
                      className={cn(
                        "cursor-pointer",
                        r.status === "yeni" && "bg-orange-50/40",
                      )}
                    >
                      <TableCell className="font-medium text-zinc-900">{r.ad_soyad}</TableCell>
                      <TableCell className="text-zinc-600">{r.brans ?? "—"}</TableCell>
                      <TableCell className="text-zinc-600">
                        {r.deneyim_yili != null ? `${r.deneyim_yili} yıl` : "—"}
                      </TableCell>
                      <TableCell className="text-zinc-600 tabular-nums">{r.telefon}</TableCell>
                      <TableCell className="text-zinc-600">{formatDate(r.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StatusSelect<BasvuruStatus>
                          value={(r.status as BasvuruStatus) ?? "yeni"}
                          options={BASVURU_STATUS_OPTIONS}
                          colors={BASVURU_STATUS_COLORS}
                          onChange={(v) => handleStatus(updateKocStatus, r.id, v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Detay Dialog ────────────────────────────────────────────────── */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail?.kind === "kurum" && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.row.institution_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Row label="Yetkili" value={detail.row.full_name} />
                <Row label="İl" value={detail.row.city} />
                <Row label="Telefon" value={detail.row.phone} />
                <Row label="E-posta" value={detail.row.email} />
                <Row label="Öğrenci Sayısı" value={detail.row.student_count} />
                <Row label="Koç Sayısı" value={detail.row.coach_count} />
                <Separator />
                <Row label="Mesaj" value={detail.row.message} />
                <Separator />
                <Row label="Başvuru Tarihi" value={formatDateTime(detail.row.created_at)} />
              </div>
            </>
          )}
          {detail?.kind === "koc" && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.row.ad_soyad}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Row label="Branş" value={detail.row.brans} />
                <Row
                  label="Deneyim"
                  value={detail.row.deneyim_yili != null ? `${detail.row.deneyim_yili} yıl` : null}
                />
                <Row label="Telefon" value={detail.row.telefon} />
                <Row label="E-posta" value={detail.row.email} />
                {detail.row.cv_url && (
                  <Row
                    label="CV"
                    value={
                      <a
                        href={detail.row.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1B6B8A] underline"
                      >
                        CV&apos;yi aç
                      </a>
                    }
                  />
                )}
                <Separator />
                <Row label="Mesaj" value={detail.row.mesaj} />
                <Separator />
                <Row label="Başvuru Tarihi" value={formatDateTime(detail.row.created_at)} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
