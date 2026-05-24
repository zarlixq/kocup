"use client"

import { useMemo, useState, useTransition } from "react"
import { MoreHorizontal, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { ApproveDialog } from "@/components/mudur/approve-dialog"
import { RejectDialog } from "@/components/mudur/reject-dialog"
import { ApplicationDetailDialog } from "@/components/mudur/application-detail-dialog"
import { ScheduleTanitimDialog } from "@/components/mudur/schedule-tanitim-dialog"
import { markTanitimCompleted } from "@/app/mudur/basvurular/actions"
import type { Tables } from "@/lib/database.types"

type Application = Tables<"applications">
type Coach = { id: string; full_name: string }
type ProfileLookup = Record<string, string>

type TanitimInfo = {
  start_time: string
  end_time: string
  coachName: string
  status: string
}

type Props = {
  applications: Application[]
  coaches: Coach[]
  studentCoachLookup: ProfileLookup
  reviewerLookup: ProfileLookup
  tanitimLookup: Record<string, TanitimInfo>
  currentUser: { id: string; full_name: string }
}

type StatusKey = "pending" | "tanitim_planlandi" | "tanitim_tamamlandi" | "approved" | "rejected"

const STATUS_LABEL: Record<
  StatusKey,
  { label: string; variant: "pending" | "paid" | "inactive" | "partial" }
> = {
  pending: { label: "Bekliyor", variant: "pending" },
  tanitim_planlandi: { label: "Tanıtım Planlandı", variant: "partial" },
  tanitim_tamamlandi: { label: "Tanıtım Tamamlandı", variant: "partial" },
  approved: { label: "Onaylandı", variant: "paid" },
  rejected: { label: "Reddedildi", variant: "inactive" },
}

const GRADE_LABEL: Record<string, string> = {
  "9": "9", "10": "10", "11": "11", "12": "12", Mezun: "Mezun",
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

function formatTanitim(t: TanitimInfo) {
  const d = new Date(t.start_time)
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type DialogState =
  | { kind: "none" }
  | { kind: "approve"; app: Application }
  | { kind: "reject"; app: Application }
  | { kind: "detail"; app: Application }
  | { kind: "tanitim"; app: Application }

type TabValue = "pending" | "tanitim" | "approved" | "rejected" | "all"

function isInTanitimGroup(status: string) {
  return status === "tanitim_planlandi" || status === "tanitim_tamamlandi"
}

export function ApplicationsView({
  applications,
  coaches,
  studentCoachLookup,
  reviewerLookup,
  tanitimLookup,
  currentUser,
}: Props) {
  const [tab, setTab] = useState<TabValue>("pending")
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" })
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c = { pending: 0, tanitim: 0, approved: 0, rejected: 0 }
    for (const a of applications) {
      if (a.status === "pending") c.pending++
      else if (isInTanitimGroup(a.status)) c.tanitim++
      else if (a.status === "approved") c.approved++
      else if (a.status === "rejected") c.rejected++
    }
    return c
  }, [applications])

  const filtered = useMemo(() => {
    if (tab === "all") return applications
    if (tab === "tanitim") return applications.filter((a) => isInTanitimGroup(a.status))
    return applications.filter((a) => a.status === tab)
  }, [applications, tab])

  function handleMarkTanitimDone(appId: string) {
    startTransition(async () => {
      const res = await markTanitimCompleted(appId)
      if (!res.success) {
        toast.error(res.error ?? "İşaretlenemedi")
        return
      }
      toast.success("✅ Tanıtım dersi tamamlandı olarak işaretlendi")
    })
  }

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            Bekleyen
            {counts.pending > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                {counts.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tanitim" className="gap-2">
            Tanıtım
            {counts.tanitim > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold">
                {counts.tanitim}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Onaylanmış</TabsTrigger>
          <TabsTrigger value="rejected">Reddedilmiş</TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="m-0">
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                {tab === "pending"
                  ? "Bekleyen başvuru yok."
                  : tab === "tanitim"
                  ? "Tanıtım dersi planlanmış başvuru yok."
                  : tab === "approved"
                  ? "Onaylanmış başvuru yok."
                  : tab === "rejected"
                  ? "Reddedilmiş başvuru yok."
                  : "Henüz başvuru yok."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Sınıf</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tanıtım</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app) => {
                    const s = STATUS_LABEL[app.status as StatusKey] ?? STATUS_LABEL.pending
                    const tan = app.tanitim_appointment_id
                      ? tanitimLookup[app.tanitim_appointment_id]
                      : null
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-zinc-900">{app.full_name}</TableCell>
                        <TableCell className="text-zinc-600">{app.email}</TableCell>
                        <TableCell className="text-zinc-600">{app.phone}</TableCell>
                        <TableCell className="text-zinc-600">{GRADE_LABEL[app.grade] ?? app.grade}</TableCell>
                        <TableCell className="text-zinc-600">{formatDate(app.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600">
                          {tan ? (
                            <div className="flex flex-col">
                              <span className="font-medium tabular-nums">
                                {formatTanitim(tan)}
                              </span>
                              <span className="text-zinc-500">{tan.coachName}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {app.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDialog({ kind: "tanitim", app })}
                                className="text-[#F97316] border-orange-200 hover:bg-orange-50"
                              >
                                <CalendarIcon className="h-3.5 w-3.5" /> Tanıtım Ayarla
                              </Button>
                            )}
                            {app.status === "tanitim_planlandi" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkTanitimDone(app.id)}
                                disabled={pending}
                              >
                                Tanıtım Tamamlandı
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">İşlem menüsü</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDialog({ kind: "detail", app })}>
                                  Detay
                                </DropdownMenuItem>
                                {(app.status === "pending" || app.status === "tanitim_tamamlandi") && (
                                  <DropdownMenuItem onClick={() => setDialog({ kind: "approve", app })}>
                                    {app.status === "pending" ? "Doğrudan Onayla" : "Onayla"}
                                  </DropdownMenuItem>
                                )}
                                {app.status === "tanitim_planlandi" && (
                                  <DropdownMenuItem onClick={() => setDialog({ kind: "tanitim", app })}>
                                    Tanıtımı Yeniden Planla
                                  </DropdownMenuItem>
                                )}
                                {(app.status === "pending" ||
                                  app.status === "tanitim_planlandi" ||
                                  app.status === "tanitim_tamamlandi") && (
                                  <DropdownMenuItem
                                    onClick={() => setDialog({ kind: "reject", app })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    Reddet
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {dialog.kind === "approve" && (
        <ApproveDialog
          open
          onOpenChange={(o) => !o && setDialog({ kind: "none" })}
          applicationId={dialog.app.id}
          applicantName={dialog.app.full_name}
          coaches={coaches}
        />
      )}
      {dialog.kind === "reject" && (
        <RejectDialog
          open
          onOpenChange={(o) => !o && setDialog({ kind: "none" })}
          applicationId={dialog.app.id}
          applicantName={dialog.app.full_name}
        />
      )}
      {dialog.kind === "detail" && (
        <ApplicationDetailDialog
          open
          onOpenChange={(o) => !o && setDialog({ kind: "none" })}
          application={dialog.app}
          coachName={
            dialog.app.approved_student_id
              ? studentCoachLookup[dialog.app.approved_student_id] ?? null
              : null
          }
          reviewerName={dialog.app.reviewed_by ? reviewerLookup[dialog.app.reviewed_by] ?? null : null}
        />
      )}
      {dialog.kind === "tanitim" && (
        <ScheduleTanitimDialog
          open
          onOpenChange={(o) => !o && setDialog({ kind: "none" })}
          applicationId={dialog.app.id}
          applicantName={dialog.app.full_name}
          coaches={coaches}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
