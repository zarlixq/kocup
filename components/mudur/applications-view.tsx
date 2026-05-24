"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal } from "lucide-react"
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
import type { Tables } from "@/lib/database.types"

type Application = Tables<"applications">
type Coach = { id: string; full_name: string }
type ProfileLookup = Record<string, string>

type Props = {
  applications: Application[]
  coaches: Coach[]
  /** Maps student profile id (after approval) → coach full_name */
  studentCoachLookup: ProfileLookup
  /** Maps reviewer profile id → full_name */
  reviewerLookup: ProfileLookup
}

const STATUS_LABEL: Record<string, { label: string; variant: "pending" | "paid" | "inactive" }> = {
  pending: { label: "Bekliyor", variant: "pending" },
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

type DialogState =
  | { kind: "none" }
  | { kind: "approve"; app: Application }
  | { kind: "reject"; app: Application }
  | { kind: "detail"; app: Application }

export function ApplicationsView({
  applications,
  coaches,
  studentCoachLookup,
  reviewerLookup,
}: Props) {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" })

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    for (const a of applications) {
      if (a.status === "pending") c.pending++
      else if (a.status === "approved") c.approved++
      else if (a.status === "rejected") c.rejected++
    }
    return c
  }, [applications])

  const filtered = useMemo(() => {
    if (tab === "all") return applications
    return applications.filter((a) => a.status === tab)
  }, [applications, tab])

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            Bekleyen
            {counts.pending > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                {counts.pending}
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
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app) => {
                    const s = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending
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
                        <TableCell className="text-right">
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
                              {app.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => setDialog({ kind: "approve", app })}>
                                    Onayla
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDialog({ kind: "reject", app })}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    Reddet
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  )
}
