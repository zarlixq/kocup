"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deletePaymentAction } from "@/app/admin/payments/actions"
import { toast } from "sonner"

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu ödemeyi silmek istediğine emin misin?")) return
        start(async () => {
          const res = await deletePaymentAction(paymentId)
          if (res?.error) toast.error(res.error)
          else toast.success("Ödeme silindi")
        })
      }}
    >
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  )
}
