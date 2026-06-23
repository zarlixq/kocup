"use client"

import { useTransition } from "react"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getExamPdfSignedUrl } from "@/lib/exams/pdf-actions"

export function ExamPdfButton({
  examId,
  label = "PDF'i Gör",
  variant = "outline",
  size = "sm",
}: {
  examId: string
  label?: string
  variant?: "outline" | "ghost" | "accent" | "default"
  size?: "sm" | "default" | "icon"
}) {
  const [pending, start] = useTransition()

  function open() {
    start(async () => {
      const res = await getExamPdfSignedUrl(examId)
      if (res.error || !res.url) {
        toast.error(res.error ?? "PDF açılamadı.")
        return
      }
      window.open(res.url, "_blank", "noopener,noreferrer")
    })
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={open} disabled={pending}>
      <FileText className="h-4 w-4" /> {pending ? "Açılıyor..." : label}
    </Button>
  )
}
