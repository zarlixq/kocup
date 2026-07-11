"use client"

import { useState, useTransition } from "react"
import { UserPlus, Copy, Check } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createStudentWithPasswordOrg } from "@/app/kurum/actions"

const NO_COACH = "__none__"
const GRADES = ["9", "10", "11", "12", "Mezun"]

export function AddStudentDialog({ coaches }: { coaches: { id: string; full_name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [grade, setGrade] = useState<string>("")
  const [school, setSchool] = useState("")
  const [coachId, setCoachId] = useState<string>(NO_COACH)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setFullName("")
    setEmail("")
    setPhone("")
    setGrade("")
    setSchool("")
    setCoachId(NO_COACH)
    setCredentials(null)
    setCopied(false)
  }

  function handleClose(o: boolean) {
    if (pending) return
    setOpen(o)
    if (!o) reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await createStudentWithPasswordOrg({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        grade: grade || null,
        school: school.trim() || null,
        coach_id: coachId === NO_COACH ? null : coachId,
      })
      if (res.success && res.data) {
        toast.success("Öğrenci hesabı oluşturuldu.")
        setCredentials(res.data)
      } else {
        toast.error(res.error ?? "Öğrenci oluşturulamadı.")
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
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Öğrenci Ekle
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {credentials ? (
            <>
              <DialogHeader>
                <DialogTitle>Öğrenci Oluşturuldu</DialogTitle>
                <DialogDescription>
                  Bu bilgileri güvenli paylaşın. Öğrenci ilk girişte şifresini değiştirecek.
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
                <Button variant="outline" onClick={reset}>Yeni Öğrenci</Button>
                <Button variant="accent" onClick={() => handleClose(false)}>Kapat</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Öğrenci Ekle</DialogTitle>
                <DialogDescription>
                  Geçici şifreyle hesap oluşturulur (mail gönderilmez). Öğrenci ilk girişte şifresini değiştirir.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="st-name">Ad Soyad *</Label>
                  <Input id="st-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-email">E-posta *</Label>
                  <Input id="st-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="st-phone">Telefon (ops.)</Label>
                    <Input id="st-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="st-grade">Sınıf (ops.)</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger id="st-grade">
                        <SelectValue placeholder="Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g === "Mezun" ? "Mezun" : `${g}. Sınıf`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-school">Okul (ops.)</Label>
                  <Input id="st-school" value={school} onChange={(e) => setSchool(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-coach">Koç (ops.)</Label>
                  <Select value={coachId} onValueChange={setCoachId}>
                    <SelectTrigger id="st-coach">
                      <SelectValue placeholder="Koç seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COACH}>Atanmamış</SelectItem>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={pending}>
                    Vazgeç
                  </Button>
                  <Button type="submit" variant="accent" disabled={pending}>
                    {pending ? "Oluşturuluyor..." : "Oluştur"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
