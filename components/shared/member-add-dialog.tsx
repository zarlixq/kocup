"use client"

import { useState, useTransition } from "react"
import { Copy, Check, Mail, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type MemberAddResult = {
  success: boolean
  error?: string
  data?: { email: string; password: string }
}

export type MemberAddPayload = { full_name: string; email: string; phone: string | null }

type Mode = "invite" | "password"

/**
 * Kuruma koç/yönetici eklemek için ortak diyalog: "Davet" (mail linki) veya
 * "Manuel" (geçici şifre — ekranda gösterilir). Actions parent'tan bind edilir
 * (örn. org_admin kendi org'unu server-side türetir, müdür orgId geçer).
 */
export function MemberAddDialog({
  open,
  onOpenChange,
  title,
  description,
  inviteAction,
  passwordAction,
  invitedMessage = "Davet gönderildi.",
  createdMessage = "Hesap oluşturuldu.",
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  inviteAction: (payload: MemberAddPayload) => Promise<{ success: boolean; error?: string }>
  passwordAction: (payload: MemberAddPayload) => Promise<MemberAddResult>
  invitedMessage?: string
  createdMessage?: string
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
    const payload: MemberAddPayload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    }
    start(async () => {
      if (mode === "invite") {
        const res = await inviteAction(payload)
        if (res.success) {
          toast.success(invitedMessage)
          onOpenChange(false)
          reset()
        } else {
          toast.error(res.error ?? "Davet gönderilemedi.")
        }
      } else {
        const res = await passwordAction(payload)
        if (res.success && res.data) {
          toast.success(createdMessage)
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
              <DialogTitle>Hesap Oluşturuldu</DialogTitle>
              <DialogDescription>
                Bu bilgileri güvenli paylaşın. Kullanıcı ilk girişte şifresini değiştirecek.
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
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
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
                <Label htmlFor="ma-name">Ad Soyad *</Label>
                <Input id="ma-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ma-email">E-posta *</Label>
                <Input id="ma-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ma-phone">Telefon (ops.)</Label>
                <Input id="ma-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0 5__ ___ __ __" />
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
