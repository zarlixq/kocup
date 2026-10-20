"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Copy, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInvitationAction } from "@/lib/invitations/actions"
import { INVITE_GRADES } from "@/lib/bireysel/schemas"

export type InviteOption = { id: string; name: string }
export type InviteCoachOption = { id: string; name: string; organization_id: string | null }

const NONE = "__none__"

function gradeLabel(g: string) {
  return g === "Mezun" ? "Mezun" : `${g}. sınıf`
}

export async function copyLink(link: string) {
  try {
    await navigator.clipboard.writeText(link)
    toast.success("Davet bağlantısı kopyalandı.")
  } catch {
    toast.message(link)
  }
}

/** Davet bağlantısı (e-posta servisi kapalıysa elle iletilir). */
export function InviteLinkBox({ link, emailed }: { link: string; emailed: boolean }) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-600">
        {emailed
          ? "Davet e-postası gönderildi. İstersen bağlantıyı ayrıca iletebilirsin:"
          : "E-posta servisi yapılandırılmadığı için e-posta gönderilmedi. Bu bağlantıyı öğrenciye ilet (7 gün geçerli, tek kullanımlık):"}
      </p>
      <div className="flex gap-2">
        <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" size="icon" onClick={() => copyLink(link)} aria-label="Kopyala">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

type Props = {
  /** Müdür: kurum seçilebilir. org_admin: kurum sabit (lockedOrgId). */
  organizations: InviteOption[]
  coaches: InviteCoachOption[]
  lockedOrgId?: string | null
}

export function InviteStudentDialog({ organizations, coaches, lockedOrgId = null }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [segment, setSegment] = useState<"yks" | "lgs">("yks")
  const [grade, setGrade] = useState<string>("")
  const [orgId, setOrgId] = useState<string>(lockedOrgId ?? NONE)
  const [coachId, setCoachId] = useState<string>(NONE)
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(null)

  const effectiveOrg = lockedOrgId ?? (orgId === NONE ? null : orgId)
  // Kurum seçiliyse yalnız o kurumun koçları; değilse kurumsuz (bağımsız) koçlar.
  const coachOptions = coaches.filter((c) => c.organization_id === effectiveOrg)
  const grades = INVITE_GRADES.filter((g) => (segment === "lgs" ? ["5", "6", "7", "8"].includes(g) : !["5", "6", "7", "8"].includes(g)))

  function reset() {
    setSegment("yks")
    setGrade("")
    setOrgId(lockedOrgId ?? NONE)
    setCoachId(NONE)
    setResult(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!grade) {
      toast.error("Sınıf/durum seç.")
      return
    }
    startTransition(async () => {
      const res = await createInvitationAction({
        full_name: fd.get("full_name"),
        email: fd.get("email"),
        phone: fd.get("phone") || null,
        segment,
        grade,
        organization_id: effectiveOrg,
        coach_id: coachId === NONE ? null : coachId,
      })
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Davet oluşturulamadı.")
        return
      }
      toast.success(res.data.emailed ? "Davet gönderildi." : "Davet oluşturuldu.")
      setResult(res.data)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-[#1B6B8A] hover:bg-[#155a75]">
          <UserPlus className="h-4 w-4" />
          Öğrenci davet et
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Öğrenci davet et</DialogTitle>
          <DialogDescription>
            Öğrenci bağlantıyla şifresini belirleyip hesabını oluşturur.{" "}
            {lockedOrgId ? "Öğrenci kurumunuza bağlanır." : "Koç ve kurum boş bırakılırsa bireysel öğrenci olur."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <InviteLinkBox link={result.link} emailed={result.emailed} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>Yeni davet</Button>
              <Button onClick={() => setOpen(false)}>Kapat</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inv-name">Ad soyad *</Label>
                <Input id="inv-name" name="full_name" required minLength={3} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">E-posta *</Label>
                <Input id="inv-email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-phone">Telefon</Label>
                <Input id="inv-phone" name="phone" type="tel" maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Segment *</Label>
                <Select
                  value={segment}
                  onValueChange={(v) => {
                    setSegment(v as "yks" | "lgs")
                    setGrade("")
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yks">YKS</SelectItem>
                    <SelectItem value="lgs">LGS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sınıf / durum *</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>{gradeLabel(g)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!lockedOrgId && (
                <div className="space-y-1.5">
                  <Label>Kurum</Label>
                  <Select
                    value={orgId}
                    onValueChange={(v) => {
                      setOrgId(v)
                      setCoachId(NONE)
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Kurum yok (bireysel)</SelectItem>
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Koç</Label>
                <Select value={coachId} onValueChange={setCoachId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Koç yok</SelectItem>
                    {coachOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Vazgeç</Button>
              <Button type="submit" disabled={pending} className="bg-[#1B6B8A] hover:bg-[#155a75]">
                {pending ? "Gönderiliyor..." : "Davet gönder"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
