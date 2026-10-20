"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { MailPlus, MoreHorizontal, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { InviteLinkBox, InviteStudentDialog, type InviteCoachOption, type InviteOption } from "@/components/invitations/invite-dialog"
import { BulkInviteDialog } from "@/components/invitations/bulk-invite-dialog"
import { cancelInvitationAction, resendInvitationAction } from "@/lib/invitations/actions"
import { formatDateTr } from "@/lib/bireysel/format"
import { cn } from "@/lib/utils"

export type InvitationListRow = {
  id: string
  full_name: string
  email: string
  segment: string
  grade: string | null
  organization_name: string | null
  coach_name: string | null
  status: "gonderildi" | "kabul_edildi" | "suresi_doldu" | "iptal"
  expires_at: string
  sent_at: string
  send_count: number
  invited_by_name: string | null
}

const STATUS_LABEL: Record<InvitationListRow["status"], string> = {
  gonderildi: "Gönderildi",
  kabul_edildi: "Kabul edildi",
  suresi_doldu: "Süresi doldu",
  iptal: "İptal",
}
const STATUS_CLASS: Record<InvitationListRow["status"], string> = {
  gonderildi: "bg-blue-50 text-blue-700 border-blue-200",
  kabul_edildi: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suresi_doldu: "bg-amber-50 text-amber-700 border-amber-200",
  iptal: "bg-zinc-100 text-zinc-500 border-zinc-200",
}
const ALL = "__all__"

type Props = {
  invitations: InvitationListRow[]
  organizations: InviteOption[]
  coaches: InviteCoachOption[]
  lockedOrgId?: string | null
}

export function InvitationsView({ invitations, organizations, coaches, lockedOrgId = null }: Props) {
  const [status, setStatus] = useState<string>(ALL)
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [linkResult, setLinkResult] = useState<{ link: string; emailed: boolean } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invitations.filter(
      (i) =>
        (status === ALL || i.status === status) &&
        (!q || i.full_name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q)),
    )
  }, [invitations, status, query])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of invitations) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [invitations])

  function resend(id: string) {
    startTransition(async () => {
      const res = await resendInvitationAction(id)
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Gönderilemedi.")
        return
      }
      toast.success("Davet yenilendi (7 gün geçerli).")
      setLinkResult(res.data)
    })
  }

  function cancel(id: string) {
    startTransition(async () => {
      const res = await cancelInvitationAction(id)
      if (res.success) toast.success("Davet iptal edildi.")
      else toast.error(res.error ?? "İptal edilemedi.")
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Davetler</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {invitations.length} davet · {counts.gonderildi ?? 0} bekliyor · {counts.kabul_edildi ?? 0} kabul edildi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkInviteDialog organizations={organizations} coaches={coaches} lockedOrgId={lockedOrgId} />
          <InviteStudentDialog organizations={organizations} coaches={coaches} lockedOrgId={lockedOrgId} />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="Ad veya e-posta ile ara..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm durumlar</SelectItem>
            {(Object.keys(STATUS_LABEL) as InvitationListRow["status"][]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]} ({counts[s] ?? 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {invitations.length === 0 ? (
        <EmptyState icon={MailPlus} title="Henüz davet yok" description="Öğrenci davet ederek başlayın." />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">Filtreyle eşleşen davet yok.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Sınıf</TableHead>
                {!lockedOrgId && <TableHead>Kurum</TableHead>}
                <TableHead>Koç</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Gönderim</TableHead>
                <TableHead>Son geçerlilik</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const actionable = i.status === "gonderildi" || i.status === "suresi_doldu"
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium text-zinc-900">{i.full_name}</div>
                      <div className="text-xs text-zinc-500">{i.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {i.segment.toUpperCase()} · {i.grade === "Mezun" ? "Mezun" : i.grade ? `${i.grade}. sınıf` : "—"}
                    </TableCell>
                    {!lockedOrgId && <TableCell className="text-sm text-zinc-600">{i.organization_name ?? "—"}</TableCell>}
                    <TableCell className="text-sm text-zinc-600">{i.coach_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-medium", STATUS_CLASS[i.status])}>{STATUS_LABEL[i.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {formatDateTr(i.sent_at)}
                      {i.send_count > 1 && <span className="text-xs text-zinc-400"> ({i.send_count}. gönderim)</span>}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">{formatDateTr(i.expires_at)}</TableCell>
                    <TableCell className="text-right">
                      {actionable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending} aria-label="İşlemler">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resend(i.id)}>Tekrar gönder</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => cancel(i.id)} className="text-red-600 focus:text-red-600">İptal et</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!linkResult} onOpenChange={(o) => !o && setLinkResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni davet bağlantısı</DialogTitle>
          </DialogHeader>
          {linkResult && <InviteLinkBox link={linkResult.link} emailed={linkResult.emailed} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
