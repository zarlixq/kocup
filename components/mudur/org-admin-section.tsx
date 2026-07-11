"use client"

import { useState, useTransition } from "react"
import { Plus, ShieldCheck, Copy, Check, Mail, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { inviteOrgAdmin, createOrgAdminWithPassword } from "@/app/mudur/kurumlar/actions"

export type OrgAdminRow = {
  id: string
  full_name: string
  email: string
  status: "aktif" | "beklemede"
}

type Mode = "invite" | "password"

export function OrgAdminSection({
  orgId,
  admins,
}: {
  orgId: string
  admins: OrgAdminRow[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">
          Kurum Yöneticileri ({admins.length})
        </h2>
        <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Yönetici Ekle
        </Button>
      </div>

      {admins.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-zinc-500">
          Bu kurumun henüz yöneticisi yok. Yönetici, kendi panelinden koç ve öğrenci ekleyebilir.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {admins.map((a) => (
            <div key={a.id} className="bg-white border border-zinc-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F97316]/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-[#F97316]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-900 truncate">{a.full_name}</div>
                  <div className="text-xs text-zinc-500 truncate">{a.email}</div>
                  <div className="mt-2">
                    {a.status === "aktif" ? (
                      <Badge variant="outline" className="text-green-700 border-green-200">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-200">Beklemede</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <OrgAdminDialog orgId={orgId} open={open} onOpenChange={setOpen} />
    </section>
  )
}

function OrgAdminDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<Mode>("invite")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setFullName("")
    setEmail("")
    setPhone("")
    setCredentials(null)
    setCopied(false)
    setMode("invite")
  }

  function handleClose(o: boolean) {
    if (pending) return
    onOpenChange(o)
    if (!o) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { full_name: fullName.trim(), email: email.trim(), phone: phone.trim() || null }
    start(async () => {
      if (mode === "invite") {
        const res = await inviteOrgAdmin(orgId, payload)
        if (res.success) {
          toast.success("Yönetici davet edildi.")
          onOpenChange(false)
          reset()
        } else {
          toast.error(res.error ?? "Davet gönderilemedi.")
        }
      } else {
        const res = await createOrgAdminWithPassword(orgId, payload)
        if (res.success && res.data) {
          toast.success("Yönetici hesabı oluşturuldu.")
          setCredentials(res.data)
        } else {
          toast.error(res.error ?? "Hesap oluşturulamadı.")
        }
      }
    })
  }

  async function copyCreds() {
    if (!credentials) return
    await navigator.clipboard.writeText(
      `E-posta: ${credentials.email}\nGeçici şifre: ${credentials.password}`,
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Yönetici Oluşturuldu</DialogTitle>
              <DialogDescription>
                Bu bilgileri güvenli paylaşın. Yönetici ilk girişte şifresini değiştirecek.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">E-posta</span>
                <span className="font-medium text-zinc-900">{credentials.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Geçici şifre</span>
                <span className="font-mono font-medium text-zinc-900">{credentials.password}</span>
              </div>
              <Button variant="accent" size="sm" onClick={copyCreds} className="w-full mt-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopyalandı" : "Bilgileri Kopyala"}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="accent" onClick={() => handleClose(false)}>Kapat</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Kurum Yöneticisi Ekle</DialogTitle>
              <DialogDescription>
                Davet ile e-posta linki gönderilir; manuel ile geçici şifreli hesap hemen oluşturulur.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("invite")}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${mode === "invite" ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200"}`}
              >
                <span className="font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Davet</span>
                E-posta ile şifre belirleme linki.
              </button>
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${mode === "password" ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200"}`}
              >
                <span className="font-medium flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Manuel</span>
                Geçici şifre; ekranda gösterilir.
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="oa-name">Ad Soyad *</Label>
                <Input id="oa-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oa-email">E-posta *</Label>
                <Input id="oa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oa-phone">Telefon (ops.)</Label>
                <Input id="oa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0 5__ ___ __ __" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={pending}>
                  Vazgeç
                </Button>
                <Button type="submit" variant="accent" disabled={pending}>
                  {pending ? "İşleniyor..." : mode === "invite" ? "Davet Et" : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
