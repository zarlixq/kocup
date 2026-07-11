"use client"

import { useState } from "react"
import { Plus, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MemberAddDialog } from "@/components/shared/member-add-dialog"
import { inviteOrgAdmin, createOrgAdminWithPassword } from "@/app/mudur/kurumlar/actions"

export type OrgAdminRow = {
  id: string
  full_name: string
  email: string
  status: "aktif" | "beklemede"
}

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

      <MemberAddDialog
        open={open}
        onOpenChange={setOpen}
        title="Kurum Yöneticisi Ekle"
        description="Davet ile e-posta linki gönderilir; manuel ile geçici şifreli hesap hemen oluşturulur."
        inviteAction={(p) => inviteOrgAdmin(orgId, p)}
        passwordAction={(p) => createOrgAdminWithPassword(orgId, p)}
        invitedMessage="Yönetici davet edildi."
        createdMessage="Yönetici hesabı oluşturuldu."
      />
    </section>
  )
}
