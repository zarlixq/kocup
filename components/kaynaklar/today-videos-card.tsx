"use client"

import { useOptimistic, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarClock, Check, Clock, ExternalLink, ListVideo, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WatchToggle } from "@/components/kaynaklar/video-playlist-card"
import { formatClock, formatSpan } from "@/lib/resources/video-match"
import { formatDateTr } from "@/lib/resources/playlist-plan"
import { youtubeWatchUrl } from "@/lib/resources/videos"
import type { AgendaVideo, VideoAgenda } from "@/lib/resources/playlist-plan-service"
import { dismissVideoCheckin, markVideo, markVideosWatched, shiftVideoPlan } from "@/app/ogrenci/kaynaklarim/video-actions"

type Understanding = NonNullable<AgendaVideo["understanding"]>

const UNDERSTANDING: { value: Understanding; label: string; cls: string }[] = [
  { value: "anladim", label: "Anladım", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  { value: "kismen", label: "Kısmen", cls: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "anlamadim", label: "Anlamadım", cls: "border-red-300 bg-red-50 text-red-800" },
]

type Patch = { id: string; watch_status?: AgendaVideo["watch_status"]; understanding?: AgendaVideo["understanding"] } | { ids: string[]; watched: true }

function reduce(list: AgendaVideo[], p: Patch): AgendaVideo[] {
  if ("ids" in p) return list.map((v) => (p.ids.includes(v.id) ? { ...v, watch_status: "izlendi" } : v))
  return list.map((v) => (v.id === p.id ? { ...v, ...p } : v))
}

/** "Dün planlanan 2 video" / "20.10.2026 ve öncesinden 3 video". */
function overdueText(count: number, lastDate: string | null, yesterday: string): string {
  if (lastDate === yesterday) return `Dün planlanan ${count} videoyu izledin mi?`
  return `${formatDateTr(lastDate)}${count > 1 ? " ve öncesinde" : ""} planlanan ${count} videoyu izledin mi?`
}

/**
 * Dashboard → "Bugün izleyeceklerin": plan tarihine göre bugünün videoları,
 * üstte gecikenler (izledim / kaydır) ve günde bir kez sorulan "dünün
 * videolarını izledin mi?" penceresi (cevap tarihi DB'de).
 */
export function TodayVideosCard({
  agenda,
  yesterday,
  askCheckin,
}: {
  agenda: VideoAgenda
  yesterday: string
  askCheckin: boolean
}) {
  const [items, apply] = useOptimistic([...agenda.overdue, ...agenda.today], reduce)
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<"watched" | "shift" | null>(null)
  const [checkinOpen, setCheckinOpen] = useState(askCheckin && agenda.overdue.length > 0)

  const overdue = items.filter((v) => agenda.overdue.some((o) => o.id === v.id) && v.watch_status !== "izlendi")
  const today = items.filter((v) => agenda.today.some((o) => o.id === v.id))
  const todayLeft = today.filter((v) => v.watch_status !== "izlendi")
  const todaySeconds = today.reduce((s, v) => s + (v.duration_seconds ?? 0), 0)

  function toggle(v: AgendaVideo) {
    const watched = v.watch_status !== "izlendi"
    startTransition(async () => {
      apply({ id: v.id, watch_status: watched ? "izlendi" : "izlenmedi", understanding: watched ? v.understanding : null })
      const res = await markVideo(v.id, { watched })
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      if (res.data?.learned && v.topic_name) toast.success(`${v.topic_name}: konu anlatımı tamamlandı, soru çözümüne geçebilirsin.`)
    })
  }

  function rate(v: AgendaVideo, understanding: Understanding) {
    startTransition(async () => {
      apply({ id: v.id, understanding, watch_status: "izlendi" })
      const res = await markVideo(v.id, { understanding })
      if (!res.success) toast.error(res.error ?? "Kaydedilemedi.")
    })
  }

  async function watchedAll() {
    const ids = overdue.map((v) => v.id)
    if (!ids.length) return
    setBusy("watched")
    startTransition(async () => {
      apply({ ids, watched: true })
      const res = await markVideosWatched(ids)
      setBusy(null)
      setCheckinOpen(false)
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      toast.success(`${res.data?.count ?? ids.length} video izlendi olarak işaretlendi.`)
    })
  }

  async function shift() {
    setBusy("shift")
    const res = await shiftVideoPlan()
    setBusy(null)
    setCheckinOpen(false)
    if (!res.success) return void toast.error(res.error ?? "Kaydırılamadı.")
    toast.success("Kalan plan kaydırıldı; geciken videolar bugüne alındı.")
  }

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" aria-labelledby="bugun-video-baslik">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="bugun-video-baslik" className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <ListVideo className="h-5 w-5 text-red-600" /> Bugün izleyeceklerin
        </h2>
        {today.length > 0 && (
          <span className="text-xs tabular-nums text-zinc-500">
            {today.length - todayLeft.length}/{today.length} izlendi · {formatSpan(todaySeconds)}
          </span>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">
              <span className="font-semibold">Gecikenler · </span>
              {overdueText(overdue.length, agenda.lastOverdueDate, yesterday)}
            </span>
          </div>
          <ul className="space-y-1">
            {overdue.map((v) => (
              <VideoLine key={v.id} video={v} onToggle={() => toggle(v)} showDate />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-10 bg-white" onClick={watchedAll} disabled={!!busy}>
              {busy === "watched" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} İzledim
            </Button>
            <Button size="sm" variant="outline" className="h-10 bg-white" onClick={shift} disabled={!!busy}>
              {busy === "shift" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} İzlemedim, kaydır
            </Button>
          </div>
        </div>
      )}

      {today.length > 0 ? (
        <ul className="divide-y divide-zinc-100">
          {today.map((v) => (
            <VideoLine key={v.id} video={v} onToggle={() => toggle(v)} onRate={(u) => rate(v, u)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Bugün için planlı video yok.
          {agenda.nextDate && ` Sıradaki plan günü ${formatDateTr(agenda.nextDate)}.`}
        </p>
      )}

      <Link href="/ogrenci/kaynaklarim" className="inline-block text-xs font-medium text-[#1B6B8A] hover:underline">
        Tüm playlist&apos;ler ve ilerleme →
      </Link>

      <Dialog
        open={checkinOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCheckinOpen(false)
            void dismissVideoCheckin()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Video planın</DialogTitle>
            <DialogDescription>{overdueText(overdue.length, agenda.lastOverdueDate, yesterday)}</DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
            {overdue.map((v) => (
              <li key={v.id} className="truncate text-zinc-700">
                • {v.title}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">“Kaydır” seçersen kalan plan bir gün ileri kayar, geciken videolar bugüne gelir.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setCheckinOpen(false); void dismissVideoCheckin() }} disabled={!!busy}>
              Sonra
            </Button>
            <Button variant="outline" onClick={shift} disabled={!!busy}>
              {busy === "shift" && <Loader2 className="h-4 w-4 animate-spin" />} İzlemedim, kaydır
            </Button>
            <Button variant="accent" onClick={watchedAll} disabled={!!busy}>
              {busy === "watched" && <Loader2 className="h-4 w-4 animate-spin" />} İzledim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function VideoLine({
  video,
  onToggle,
  onRate,
  showDate = false,
}: {
  video: AgendaVideo
  onToggle: () => void
  onRate?: (u: Understanding) => void
  showDate?: boolean
}) {
  const watched = video.watch_status === "izlendi"
  return (
    <li className="py-1.5">
      <div className="flex items-center gap-1">
        <WatchToggle watched={watched} onToggle={onToggle} />
        <a href={youtubeWatchUrl(video.youtube_video_id)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
          <span className={cn("line-clamp-2 text-sm", watched ? "text-zinc-500" : "font-medium text-zinc-900 hover:text-[#1B6B8A]")}>
            {video.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
            {video.duration_seconds != null && (
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <Clock className="h-3 w-3" /> {formatClock(video.duration_seconds)}
              </span>
            )}
            {video.channel && <span>· {video.channel}</span>}
            {showDate && <span className="tabular-nums">· {formatDateTr(video.planned_date)}</span>}
          </span>
        </a>
        <a
          href={youtubeWatchUrl(video.youtube_video_id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube'da aç"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {watched && onRate && (
        <div className="ml-11 mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Ne kadar anladın?">
          {UNDERSTANDING.map((u) => (
            <button
              key={u.value}
              type="button"
              aria-pressed={video.understanding === u.value}
              onClick={() => onRate(u.value)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium",
                video.understanding === u.value ? u.cls : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
