"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { Bell, X } from "lucide-react"
import type { TodayNotice } from "@/lib/upplan/load"
import { dismissUpplanNotification } from "@/app/ogrenci/upplan/roadmap-actions"

// Yol haritası/program büyük değişiklikleri sessizce yapılmaz: burada bildirim olarak görünür.
export function TodayNotices({ notices }: { notices: TodayNotice[] }) {
  const [list, hide] = useOptimistic(notices, (cur, id: string) => cur.filter((n) => n.id !== id))
  const [, start] = useTransition()
  if (list.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {list.map((n) => (
        <li key={n.id} className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{n.message}</span>
          <button
            type="button"
            aria-label="Bildirimi kapat"
            className="rounded p-0.5 text-sky-700 hover:bg-sky-100"
            onClick={() =>
              start(async () => {
                hide(n.id)
                const res = await dismissUpplanNotification(n.id)
                if (!res.success) toast.error(res.error ?? "Kapatılamadı.")
              })
            }
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}
