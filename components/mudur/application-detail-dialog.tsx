"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Tables } from "@/lib/database.types"

type Application = Tables<"applications">

type ApplicationDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: Application | null
  coachName?: string | null
  reviewerName?: string | null
}

const GRADE_LABEL: Record<string, string> = {
  "7": "7. Sınıf (LGS)",
  "8": "8. Sınıf (LGS)",
  "9": "9. Sınıf",
  "10": "10. Sınıf",
  "11": "11. Sınıf",
  "12": "12. Sınıf",
  Mezun: "Mezun",
}

const STATUS_LABEL: Record<string, { label: string; variant: "pending" | "paid" | "inactive" }> = {
  pending: { label: "Bekliyor", variant: "pending" },
  approved: { label: "Onaylandı", variant: "paid" },
  rejected: { label: "Reddedildi", variant: "inactive" },
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="col-span-2 text-zinc-900">{value}</span>
    </div>
  )
}

export function ApplicationDetailDialog({
  open,
  onOpenChange,
  application: app,
  coachName,
  reviewerName,
}: ApplicationDetailDialogProps) {
  if (!app) return null
  const status = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {app.full_name}
            <Badge variant={status.variant}>{status.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Row label="Email" value={app.email} />
          <Row label="Telefon" value={app.phone} />
          <Row label="Sınıf" value={GRADE_LABEL[app.grade] ?? app.grade} />
          {app.target_university && <Row label="Hedef Üniversite" value={app.target_university} />}
          {app.target_department && <Row label="Hedef Bölüm" value={app.target_department} />}
          {app.target_ranking && (
            <Row label="Hedef Sıra" value={app.target_ranking.toLocaleString("tr-TR")} />
          )}

          <Separator />

          <Row label="Veli Adı" value={app.parent_name} />
          <Row label="Veli Telefon" value={app.parent_phone} />

          <Separator />

          <Row label="Başvuru Tarihi" value={formatDateTime(app.created_at)} />

          {app.status === "approved" && (
            <>
              <Row label="Atanan Koç" value={coachName ?? "Atanmamış"} />
              <Row label="Onay Tarihi" value={formatDateTime(app.reviewed_at)} />
              <Row label="Onaylayan" value={reviewerName ?? "—"} />
            </>
          )}

          {app.status === "rejected" && (
            <>
              <Row
                label="Red Gerekçesi"
                value={<span className="text-red-700">{app.rejection_reason ?? "—"}</span>}
              />
              <Row label="Red Tarihi" value={formatDateTime(app.reviewed_at)} />
              <Row label="Reddeden" value={reviewerName ?? "—"} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
