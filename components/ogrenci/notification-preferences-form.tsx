"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateOgrenciNotificationsAction } from "@/app/ogrenci/ayarlar/actions"

type Prefs = {
  mesaj_kocum: boolean
  yeni_konu: boolean
  randevu_hatirlat: boolean
  haftalik_ozet: boolean
}

const ITEMS: { key: keyof Prefs; label: string; help: string }[] = [
  {
    key: "mesaj_kocum",
    label: "Koçumdan mesaj geldiğinde",
    help: "Koçun panelde mesaj attığında bildirim alırsın.",
  },
  {
    key: "yeni_konu",
    label: "Yeni konu atandığında",
    help: "Koçun sana yeni bir konu atadığında bildirim alırsın.",
  },
  {
    key: "randevu_hatirlat",
    label: "Randevu hatırlatması",
    help: "Yaklaşan randevulardan önce hatırlatma alırsın.",
  },
  {
    key: "haftalik_ozet",
    label: "Haftalık özet e-postası",
    help: "Her hafta gelişimini özetleyen bir e-posta gönderilir.",
  },
]

const DEFAULTS: Prefs = {
  mesaj_kocum: true,
  yeni_konu: true,
  randevu_hatirlat: true,
  haftalik_ozet: false,
}

type Props = {
  initial: Partial<Prefs>
}

export function NotificationPreferencesForm({ initial }: Props) {
  const [prefs, setPrefs] = useState<Prefs>({
    mesaj_kocum: initial.mesaj_kocum ?? DEFAULTS.mesaj_kocum,
    yeni_konu: initial.yeni_konu ?? DEFAULTS.yeni_konu,
    randevu_hatirlat: initial.randevu_hatirlat ?? DEFAULTS.randevu_hatirlat,
    haftalik_ozet: initial.haftalik_ozet ?? DEFAULTS.haftalik_ozet,
  })
  const [pending, start] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    start(async () => {
      const res = await updateOgrenciNotificationsAction(prefs)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Bildirim tercihleri kaydedildi.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-100 text-amber-900 text-xs px-3 py-2">
        Bildirim sistemi yakında devreye alınacak. Buradaki tercihlerin
        kaydedilir, sistem aktifleştiğinde anında uygulanır.
      </div>

      <div className="space-y-2">
        {ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <Label htmlFor={`pref-${item.key}`} className="font-medium text-zinc-900">
                {item.label}
              </Label>
              <p className="text-xs text-zinc-500 mt-0.5">{item.help}</p>
            </div>
            <Switch
              id={`pref-${item.key}`}
              checked={prefs[item.key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-zinc-500">
          {Object.values(prefs).filter(Boolean).length} / {ITEMS.length} açık
        </Badge>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Tercihleri Kaydet"}
        </Button>
      </div>
    </form>
  )
}
