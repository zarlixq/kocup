"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toggleStudentActiveAction } from "@/app/koc/ogrenciler/actions"
import { toast } from "sonner"

export function StudentActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      onClick={() => {
        start(async () => {
          const res = await toggleStudentActiveAction(id, !isActive)
          if (res?.error) toast.error(res.error)
          else toast.success(isActive ? "Öğrenci pasifleştirildi" : "Öğrenci aktifleştirildi")
        })
      }}
      disabled={pending}
    >
      {isActive ? "Pasif Yap" : "Aktif Et"}
    </Button>
  )
}
