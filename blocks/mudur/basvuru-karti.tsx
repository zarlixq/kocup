"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { approveApplication, rejectApplication } from "@/app/mudur/basvurular/actions"
import { Button } from "@/components/ui/button"
import type { Tables } from "@/lib/database.types"

type Application = Tables<"applications">

const GRADE_LABEL: Record<string, string> = {
  "9": "9. Sınıf", "10": "10. Sınıf",
  "11": "11. Sınıf", "12": "12. Sınıf",
  "Mezun": "Mezun",
}

export function BasvuruKarti({ application: app }: { application: Application }) {
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")

  function handleApprove() {
    startTransition(async () => {
      const result = await approveApplication(app.id)
      if (result.success) {
        toast.success("Başvuru onaylandı, davet e-postası gönderildi.")
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectApplication(app.id, reason)
      if (result.success) {
        toast.success("Başvuru reddedildi.")
        setShowReject(false)
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-zinc-900">{app.full_name}</h2>
          <p className="text-sm text-zinc-500">{app.email} · {app.phone}</p>
        </div>
        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          {GRADE_LABEL[app.grade] ?? app.grade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
        {app.target_university && (
          <div>
            <span className="text-zinc-400">Hedef üniversite: </span>
            <span className="text-zinc-700">{app.target_university}</span>
          </div>
        )}
        {app.target_department && (
          <div>
            <span className="text-zinc-400">Hedef bölüm: </span>
            <span className="text-zinc-700">{app.target_department}</span>
          </div>
        )}
        {app.target_ranking && (
          <div>
            <span className="text-zinc-400">Hedef sıra: </span>
            <span className="text-zinc-700">{app.target_ranking.toLocaleString("tr-TR")}</span>
          </div>
        )}
        <div>
          <span className="text-zinc-400">Veli: </span>
          <span className="text-zinc-700">{app.parent_name} — {app.parent_phone}</span>
        </div>
      </div>

      {showReject ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Red gerekçesi (isteğe bağlı)"
            rows={2}
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending ? "Reddediliyor..." : "Reddet"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} disabled={isPending}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-[#1B6B8A] hover:bg-[#155a75]"
            onClick={handleApprove}
            disabled={isPending}
          >
            {isPending ? "İşleniyor..." : "Onayla & Davet Et"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReject(true)}
            disabled={isPending}
          >
            Reddet
          </Button>
        </div>
      )}
    </div>
  )
}
