"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Plus, Pencil, Building2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createOrganization,
  updateOrganization,
  toggleOrganizationActive,
} from "@/app/mudur/kurumlar/actions"

export type OrgRow = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  plan: string
  is_active: boolean
  coach_count: number
  student_count: number
}

const PLANS = ["starter", "pro", "enterprise"] as const
const PLAN_LABEL: Record<string, string> = {
  starter: "Başlangıç",
  pro: "Pro",
  enterprise: "Kurumsal",
}

export function OrganizationsView({ rows }: { rows: OrgRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OrgRow | null>(null)
  const [pending, start] = useTransition()

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }
  function openEdit(row: OrgRow) {
    setEditTarget(row)
    setDialogOpen(true)
  }

  function handleToggle(row: OrgRow) {
    start(async () => {
      const res = await toggleOrganizationActive(row.id, !row.is_active)
      if (!res.success) toast.error(res.error ?? "Durum güncellenemedi.")
      else toast.success(row.is_active ? "Kurum pasifleştirildi." : "Kurum aktifleştirildi.")
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="accent" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Yeni Kurum
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz kurum yok</h3>
          <p className="text-sm text-zinc-500">İlk dershane/kurumu ekleyerek başla.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurum</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Koç</TableHead>
                <TableHead className="text-right">Öğrenci</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/mudur/kurumlar/${o.id}`}
                      className="font-medium text-zinc-900 hover:text-[#1B6B8A]"
                    >
                      {o.name}
                    </Link>
                    <div className="text-xs text-zinc-500">{o.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{PLAN_LABEL[o.plan] ?? o.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-600">{o.coach_count}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-600">{o.student_count}</TableCell>
                  <TableCell>
                    <Switch
                      checked={o.is_active}
                      onCheckedChange={() => handleToggle(o)}
                      disabled={pending}
                      aria-label="Aktiflik"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o)} aria-label="Düzenle">
                        <Pencil className="h-4 w-4 text-zinc-500" />
                      </Button>
                      <Link
                        href={`/mudur/kurumlar/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs text-[#1B6B8A] hover:underline"
                      >
                        Detay <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OrgDialog
        key={editTarget?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editTarget}
      />
    </div>
  )
}

function OrgDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: OrgRow | null
}) {
  const isEdit = Boolean(initial)
  const [pending, start] = useTransition()
  const [name, setName] = useState(initial?.name ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [plan, setPlan] = useState<string>(initial?.plan ?? "starter")
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "")
  const [primaryColor, setPrimaryColor] = useState(initial?.primary_color ?? "")
  const [accentColor, setAccentColor] = useState(initial?.accent_color ?? "")
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "")
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? "")
  const [address, setAddress] = useState(initial?.address ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error("Kurum adı en az 2 karakter olmalı.")
      return
    }
    const payload = {
      name: name.trim(),
      slug: slug.trim() || null,
      plan,
      logo_url: logoUrl.trim() || null,
      primary_color: primaryColor.trim() || null,
      accent_color: accentColor.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      address: address.trim() || null,
    }
    start(async () => {
      const res = isEdit && initial
        ? await updateOrganization(initial.id, payload)
        : await createOrganization(payload)
      if (res.success) {
        toast.success(isEdit ? "Kurum güncellendi." : "Kurum oluşturuldu.")
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kurumu Düzenle" : "Yeni Kurum"}</DialogTitle>
          <DialogDescription>Kurum bilgilerini gir. Slug boşsa addan üretilir.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Kurum Adı *</Label>
              <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug (ops.)</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="addan-uretilir"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-plan">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id="org-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLAN_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-logo">Logo URL (ops.)</Label>
              <Input id="org-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-primary">Birincil Renk</Label>
              <Input
                id="org-primary"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1B6B8A"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-accent">Vurgu Rengi</Label>
              <Input
                id="org-accent"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#F97316"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-email">İletişim E-posta</Label>
              <Input id="org-email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">İletişim Telefon</Label>
              <Input id="org-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-address">Adres</Label>
            <Input id="org-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
