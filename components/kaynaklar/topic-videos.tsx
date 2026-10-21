"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { Check, ExternalLink, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TopicVideoGroup } from "@/lib/resources/videos"
import { formatClock } from "@/lib/resources/video-match"
import { markVideo } from "@/app/ogrenci/kaynaklarim/video-actions"

const UNDERSTANDING = [
  { value: "anladim", label: "Anladım" },
  { value: "kismen", label: "Kısmen" },
  { value: "anlamadim", label: "Anlamadım" },
] as const

type Understanding = (typeof UNDERSTANDING)[number]["value"]
type Patch = { id: string; watched?: boolean; understanding?: Understanding | null }

function reduce(groups: TopicVideoGroup[], p: Patch): TopicVideoGroup[] {
  return groups.map((g) => ({
    ...g,
    videos: g.videos.map((v) => {
      if (v.id !== p.id) return v
      const next = { ...v }
      if (p.watched !== undefined) {
        next.watch_status = p.watched ? "izlendi" : "izlenmedi"
        if (!p.watched) next.understanding = null
      }
      if (p.understanding !== undefined) {
        next.understanding = p.understanding
        if (p.understanding) next.watch_status = "izlendi"
      }
      return next
    }),
  }))
}

// Konunun videoları (Konularım kartı + programdaki konu çalışması bloğu).
// Veri tek kaynak: student_resource_videos; Kaynaklarım'daki tiklerle aynı satır.
// compact (program): izlenmemişler önde, izlenenler sayı olarak.
export function TopicVideos({
  topicName,
  groups,
  compact = false,
  readonly = false,
}: {
  topicName: string
  groups: TopicVideoGroup[]
  compact?: boolean
  readonly?: boolean
}) {
  const [items, apply] = useOptimistic(groups, reduce)
  const [, start] = useTransition()
  if (items.length === 0) return null

  function mark(patch: Patch) {
    start(async () => {
      apply(patch)
      const res = await markVideo(patch.id, { watched: patch.watched, understanding: patch.understanding })
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      if (res.data?.learned) toast.success(`${topicName}: konu anlatımı tamamlandı, soru çözümüne geçebilirsin.`)
    })
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {items.map((g) => {
        const watched = g.videos.filter((v) => v.watch_status === "izlendi").length
        const shown = compact ? g.videos.filter((v) => v.watch_status !== "izlendi") : g.videos
        return (
          <details key={g.playlist_id} className="group rounded-lg border border-zinc-200 bg-white" open={!compact || watched < g.videos.length}>
            <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-800">
              <PlayCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
              <span className="min-w-0 truncate">
                {g.teacher_name} – {topicName}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                ({watched}/{g.videos.length} izlendi)
              </span>
            </summary>
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
              {shown.map((v) => {
                const isWatched = v.watch_status === "izlendi"
                return (
                  <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5 py-1 text-xs">
                    {!readonly && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isWatched}
                        onClick={() => mark({ id: v.id, watched: !isWatched })}
                        aria-label={isWatched ? "İzlenmedi olarak işaretle" : "İzledim"}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2",
                            isWatched ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 bg-white",
                          )}
                        >
                          {isWatched && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      </button>
                    )}
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-w-0 flex-1 items-center gap-1 hover:underline",
                        isWatched ? "text-zinc-500" : "text-[#1B6B8A]",
                        readonly && "px-1 py-1",
                      )}
                      title={v.title}
                    >
                      <span className="truncate">{v.title}</span>
                      {v.duration_seconds != null && <span className="shrink-0 tabular-nums text-zinc-400">{formatClock(v.duration_seconds)}</span>}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    {!readonly && !compact && (
                      <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-zinc-200">
                        {UNDERSTANDING.map((u) => (
                          <button
                            key={u.value}
                            type="button"
                            onClick={() => mark({ id: v.id, understanding: v.understanding === u.value ? null : u.value })}
                            aria-pressed={v.understanding === u.value}
                            className={cn(
                              "px-2 py-1.5 text-[11px]",
                              v.understanding === u.value
                                ? u.value === "anlamadim"
                                  ? "bg-red-50 font-medium text-red-700"
                                  : "bg-emerald-50 font-medium text-emerald-700"
                                : "text-zinc-500 hover:bg-zinc-50",
                            )}
                          >
                            {u.label}
                          </button>
                        ))}
                      </span>
                    )}
                  </li>
                )
              })}
              {compact && watched > 0 && (
                <li className="px-2.5 py-1.5 text-[11px] text-zinc-500">
                  {watched === g.videos.length ? "Tüm videolar izlendi ✓" : `+${watched} video izlendi`}
                </li>
              )}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
