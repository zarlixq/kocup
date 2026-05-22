"use client"

import { useTransition } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { endPackageAction } from "@/app/admin/packages/actions"
import { toast } from "sonner"

export function EndPackageButton({ packageId }: { packageId: string }) {
  const [pending, start] = useTransition()
  const params = useParams<{ id: string }>()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Paketi sonlandırmak istediğine emin misin?")) return
        start(async () => {
          const res = await endPackageAction(packageId, params.id)
          if (res?.error) toast.error(res.error)
          else toast.success("Paket sonlandırıldı")
        })
      }}
    >
      Sonlandır
    </Button>
  )
}
