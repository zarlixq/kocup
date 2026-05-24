"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateMyCoachProfile } from "@/app/koc/profilim/actions"

type Props = {
  initial: {
    full_name: string
    phone: string
    bio: string
    certificate_info: string
    years_experience: string
    specialties: string
  }
}

export function CoachProfileForm({ initial }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [values, setValues] = useState(initial)

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await updateMyCoachProfile(values)
      if (res.success) toast.success("Profil güncellendi")
      else {
        setError(res.error ?? "Güncellenemedi.")
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Ad Soyad *</Label>
          <Input
            id="full_name"
            value={values.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="05XX XXX XX XX"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">Hakkında</Label>
        <Textarea
          id="bio"
          value={values.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={4}
          placeholder="Eğitim, deneyim, koçluk yaklaşımı..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="certificate_info">Sertifika Bilgisi</Label>
          <Input
            id="certificate_info"
            value={values.certificate_info}
            onChange={(e) => set("certificate_info", e.target.value)}
            placeholder="MYK Onaylı Eğitim Koçluğu Sertifikası"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="years_experience">Deneyim (Yıl)</Label>
          <Input
            id="years_experience"
            type="number"
            min="0"
            value={values.years_experience}
            onChange={(e) => set("years_experience", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="specialties">Uzmanlık Alanları</Label>
        <Input
          id="specialties"
          value={values.specialties}
          onChange={(e) => set("specialties", e.target.value)}
          placeholder="virgülle ayır: TYT, AYT, Sınav Kaygısı"
        />
        <p className="text-xs text-zinc-500">Virgülle ayrılmış liste (ör. TYT, AYT, LGS).</p>
      </div>

      <Button type="submit" variant="default" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Profili Kaydet"}
      </Button>
    </form>
  )
}
