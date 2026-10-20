"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Circle, ExternalLink, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TopicVideoGroup } from "@/lib/resources/videos"
import { markVideo } from "@/app/ogrenci/kaynaklarim/video-actions"

const UNDERSTANDING = [
  { value: "anladim", label: "Anladım" },
  { value: "kismen", label: "Kısmen" },
  { value: "anlamadim", label: "Anlamadım" },
] as const

// Konunun videoları (Konularım kartı + programdaki konu çalışması bloğu).
// Video yalnız YouTube linkiyle açılır (indirme/kopyalama yok).
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
  const [pending, start] = useTransition()
  if (groups.length === 0) return null

  function mark(id: string, input: { watched?: boolean; understanding?: (typeof UNDERSTANDING)[number]["value"] | null }) {
    start(async () => {
      const res = await markVideo(id, input)
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      if (res.data?.learned) toast.success(`${topicName}: öğrenme aşaması tamamlandı, soru çözümüne geçebilirsin.`)
    })
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {groups.map((g) => (
        <details key={g.playlist_id} className="group rounded-lg border border-zinc-200 bg-white" open={!compact}>
          <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-800">
            <PlayCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span className="min-w-0 truncate">
              {g.teacher_name} – {topicName}
            </span>
            <span className="shrink-0 text-zinc-500">
              ({g.videos.filter((v) => v.watch_status === "izlendi").length}/{g.videos.length} video)
            </span>
          </summary>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {g.videos.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1.5 text-xs">
                {!readonly && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => mark(v.id, { watched: v.watch_status !== "izlendi" })}
                    aria-label={v.watch_status === "izlendi" ? "İzlenmedi olarak işaretle" : "İzledim"}
                    className="shrink-0"
                  >
                    {v.watch_status === "izlendi" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-300" />
                    )}
                  </button>
                )}
                <a
                  href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 flex-1 items-center gap-1 text-[#1B6B8A] hover:underline"
                  title={v.title}
                >
                  <span className="truncate">{v.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                {!readonly && (
                  <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-zinc-200">
                    {UNDERSTANDING.map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        disabled={pending}
                        onClick={() => mark(v.id, { understanding: v.understanding === u.value ? null : u.value })}
                        aria-pressed={v.understanding === u.value}
                        className={cn(
                          "px-1.5 py-0.5 text-[10px]",
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
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
