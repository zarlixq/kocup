"use client"

import { useState } from "react"
import { CheckCheck, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VideoRow } from "@/lib/resources/videos"

/**
 * Onay bekleyen eşleşmeler: otomatik eşleştirmenin emin olamadığı videolar
 * (konuya bağlı değil, yalnız öneri). Öğrenci toplu onaylar ya da reddeder;
 * farklı konu için videonun konu seçicisi kullanılır.
 */
export function PendingMatches({
  videos,
  onReview,
}: {
  videos: VideoRow[]
  onReview: (approve: string[], reject: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(videos.map((v) => v.id)))
  const [busy, setBusy] = useState<"onay" | "red" | null>(null)
  const ids = videos.map((v) => v.id).filter((id) => selected.has(id))
  const all = ids.length === videos.length

  async function submit(kind: "onay" | "red") {
    setBusy(kind)
    try {
      await onReview(kind === "onay" ? ids : [], kind === "red" ? ids : [])
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-2 border-t border-amber-100 bg-amber-50/60 px-3 py-3 sm:px-4" aria-label="Onay bekleyen eşleşmeler">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">{videos.length} eşleşme onay bekliyor</h3>
          <p className="text-xs text-amber-800">
            Otomatik eşleştirme bu videolarda emin olamadı; onaylayana kadar konuya bağlanmazlar. Farklı bir konu için videonun konu seçicisini kullan.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-amber-900">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#1B6B8A]"
            checked={all}
            onChange={() => setSelected(all ? new Set() : new Set(videos.map((v) => v.id)))}
          />
          Tümü
        </label>
      </div>
      <ul className="max-h-72 divide-y divide-amber-100 overflow-y-auto rounded-lg border border-amber-100 bg-white">
        {videos.map((v) => (
          <li key={v.id}>
            <label className="flex cursor-pointer items-start gap-2 px-2.5 py-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#1B6B8A]"
                checked={selected.has(v.id)}
                onChange={() =>
                  setSelected((s) => {
                    const n = new Set(s)
                    if (n.has(v.id)) n.delete(v.id)
                    else n.add(v.id)
                    return n
                  })
                }
              />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-xs text-zinc-700" title={v.title}>
                  {v.position + 1}. {v.title}
                </span>
                <span className="text-xs font-medium text-zinc-900">→ {v.suggested_topic_name ?? "Konu"}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={!ids.length || !!busy} onClick={() => submit("red")}>
          {busy === "red" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Seçilenleri reddet
        </Button>
        <Button size="sm" variant="accent" disabled={!ids.length || !!busy} onClick={() => submit("onay")}>
          {busy === "onay" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />} Seçilenleri onayla ({ids.length})
        </Button>
      </div>
    </section>
  )
}
