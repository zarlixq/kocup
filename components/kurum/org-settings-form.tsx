"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { updateOrgBranding } from "@/app/kurum/actions"

type Organization = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  plan: string
  contact_email: string | null
  contact_phone: string | null
  address: string | null
}

export function OrgSettingsForm({ organization }: { organization: Organization }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [primaryColor, setPrimaryColor] = useState(organization.primary_color ?? "")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const values = {
      name: String(fd.get("name") ?? ""),
      logo_url: String(fd.get("logo_url") ?? ""),
      primary_color: String(fd.get("primary_color") ?? ""),
      contact_email: String(fd.get("contact_email") ?? ""),
      contact_phone: String(fd.get("contact_phone") ?? ""),
    }

    startTransition(async () => {
      const res = await updateOrgBranding(values)
      if (res.success) {
        toast.success("Ayarlar güncellendi.")
        router.refresh()
      } else {
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Kurum Bilgileri</h2>
          <Badge variant="outline" className="capitalize">
            {organization.plan} plan
          </Badge>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Kurum Adı *</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              defaultValue={organization.name}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" disabled value={organization.slug} className="bg-zinc-50" />
            <p className="text-xs text-zinc-500">URL kısaltması — değiştirilemez.</p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Marka</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              name="logo_url"
              type="url"
              placeholder="https://..."
              defaultValue={organization.logo_url ?? ""}
            />
            <p className="text-xs text-zinc-500">PNG/SVG, 1:1 oranı önerilir.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_color">Ana Renk (Hex)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primary_color"
                name="primary_color"
                placeholder="#1B6B8A"
                pattern="^#[0-9a-fA-F]{6}$"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <div
                className="w-10 h-10 rounded-md border border-zinc-200 shrink-0"
                style={{ backgroundColor: primaryColor || "transparent" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">İletişim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact_email">Email</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={organization.contact_email ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Telefon</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              defaultValue={organization.contact_phone ?? ""}
              placeholder="0 5__ ___ __ __"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={organization.address ?? ""}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </div>
    </form>
  )
}
