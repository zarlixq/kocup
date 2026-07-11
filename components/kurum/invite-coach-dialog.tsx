"use client"

import { useState } from "react"
import { MemberAddDialog } from "@/components/shared/member-add-dialog"
import { inviteCoachToOrg, createCoachWithPasswordOrg } from "@/app/kurum/actions"

export function InviteCoachToOrgDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {children}
      </span>
      <MemberAddDialog
        open={open}
        onOpenChange={setOpen}
        title="Kuruma Koç Ekle"
        description="Davet ile e-posta linki gönderilir; manuel ile geçici şifreli hesap hemen oluşturulur."
        inviteAction={(p) => inviteCoachToOrg(p)}
        passwordAction={(p) => createCoachWithPasswordOrg(p)}
        invitedMessage="Davet gönderildi."
        createdMessage="Koç hesabı oluşturuldu."
      />
    </>
  )
}
