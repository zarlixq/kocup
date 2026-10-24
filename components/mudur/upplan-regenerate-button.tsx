"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { regenerateStudentRoadmap } from "@/app/mudur/upplan/actions"

/** Yol haritasını arşivle + yeni algoritmayla yeniden üret. */
export function UpplanRegenerateButton({ studentId }: { studentId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await regenerateStudentRoadmap(studentId)
          if (!res.success) return void toast.error(res.error ?? "Yeniden üretilemedi.")
          toast.success(
            res.data?.status === "superseded"
              ? "Eski yol haritası arşivlendi; öğrencinin eksik adımı var, yenisi üretilmedi."
              : `Yeni taslak üretildi (${res.data?.cancelled ?? 0} eski hedef iptal edildi).`,
          )
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Arşivle ve yeniden üret
    </Button>
  )
}
