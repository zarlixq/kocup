"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Loader2, NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { advanceSetup } from "@/app/ogrenci/upplan/actions"

export function ExamStep({ latestExam }: { latestExam: { id: string; name: string; date: string } | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function skip() {
    start(async () => {
      const res = await advanceSetup("bitti")
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      router.push("/ogrenci/upplan")
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Son denemen ustalık haritanı en hızlı netleştiren veri. Sonuçları girdikten sonra her dersteki yanlışlarını konulara
        dağıtman istenecek.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/ogrenci/denemelerim/yeni?from=upplan"
          className="flex items-start gap-3 rounded-2xl border border-[#1B6B8A] bg-[#1B6B8A]/5 p-4 hover:bg-[#1B6B8A]/10"
        >
          <FileText className="mt-0.5 h-5 w-5 text-[#1B6B8A]" />
          <div>
            <div className="text-sm font-semibold text-zinc-900">Son denemeni gir</div>
            <div className="text-xs text-zinc-500">Ders ders doğru / yanlış / boş</div>
          </div>
        </Link>
        {latestExam && (
          <Link
            href={`/ogrenci/denemelerim/${latestExam.id}?yanlislar=1&from=upplan`}
            className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 hover:border-zinc-300"
          >
            <NotebookPen className="mt-0.5 h-5 w-5 text-zinc-500" />
            <div>
              <div className="text-sm font-semibold text-zinc-900">Kayıtlı denemeni kullan</div>
              <div className="text-xs text-zinc-500">
                {latestExam.name} · {formatDate(latestExam.date, "dd.MM.yyyy")}
              </div>
            </div>
          </Link>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={skip} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Henüz denemem yok, bitir
        </Button>
      </div>
    </div>
  )
}
