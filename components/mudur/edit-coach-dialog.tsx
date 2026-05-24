"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateCoach } from "@/app/mudur/koclar/actions"

type Props = {
  coachId: string
  initial: {
    full_name: string
    phone: string
    bio: string
    certificate_info: string
    years_experience: string
    specialties: string
  }
}

export function EditCoachDialog({ coachId, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initial)
  const [pending, start] = useTransition()

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const res = await updateCoach(coachId, values)
      if (res.success) {
        toast.success("Koç güncellendi.")
        setOpen(false)
      } else {
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Koçu Düzenle</DialogTitle>
          <DialogDescription>
            Profil bilgileri landing sayfasında ve öğrencilerin panelinde görünür.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ec-name">Ad Soyad</Label>
              <Input
                id="ec-name"
                value={values.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Telefon</Label>
              <Input
                id="ec-phone"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-bio">Hakkında</Label>
            <Textarea
              id="ec-bio"
              rows={4}
              value={values.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ec-cert">Sertifika</Label>
              <Input
                id="ec-cert"
                value={values.certificate_info}
                onChange={(e) => set("certificate_info", e.target.value)}
                placeholder="MYK Onaylı Eğitim Koçluğu Sertifikası"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-exp">Deneyim (Yıl)</Label>
              <Input
                id="ec-exp"
                type="number"
                min="0"
                value={values.years_experience}
                onChange={(e) => set("years_experience", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-spec">Uzmanlık Alanları (virgülle ayır)</Label>
            <Input
              id="ec-spec"
              value={values.specialties}
              onChange={(e) => set("specialties", e.target.value)}
              placeholder="TYT, AYT, Sınav Kaygısı"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              className="bg-[#1B6B8A] hover:bg-[#155a75]"
              disabled={pending}
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
