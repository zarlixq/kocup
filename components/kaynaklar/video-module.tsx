"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, Clock, ExternalLink, Lightbulb, ListVideo, Plus, TrendingUp, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VideoAddDialog, type PlanContext } from "@/components/kaynaklar/video-add-dialog"
import { PlanDialog } from "@/components/kaynaklar/plan-dialog"
import { channelUrlOf } from "@/lib/resources/videos"
import { VideoPlaylistCard, type PlaylistHandlers } from "@/components/kaynaklar/video-playlist-card"
import { VideoSubjectTable } from "@/components/kaynaklar/video-subject-table"
import { VideoActivityChart } from "@/components/kaynaklar/video-activity-chart"
import { formatClock, formatSpan } from "@/lib/resources/video-match"
import { playlistDisplayName, youtubeWatchUrl, type PlaylistRow, type PlaylistStatus } from "@/lib/resources/videos"
import { effectiveStatus, summarizeBySubject, videoActivity, watchedOnDay } from "@/lib/resources/video-summary"
import type { VideoSuggestion } from "@/lib/resources/video-priority"
import type { TeacherStat } from "@/lib/resources/video-match"
import { istanbulDateStr } from "@/lib/tz"
import {
  confirmPlaylistSuggestions,
  deletePlaylist,
  deleteVideo,
  markVideo,
  refreshPlaylist,
  reviewVideoSuggestions,
  setVideoNote,
  setVideoTopic,
  shiftVideoPlan,
  updatePlaylist,
} from "@/app/ogrenci/kaynaklarim/video-actions"

type Topic = { id: string; name: string }

type OptAction =
  | { type: "video"; id: string; patch: Partial<PlaylistRow["videos"][number]> }
  | { type: "removeVideo"; id: string }
  | { type: "playlist"; id: string; patch: Partial<Pick<PlaylistRow, "status" | "title">> }
  | { type: "confirm"; id: string }
  | { type: "removePlaylist"; id: string }

function reduce(state: PlaylistRow[], a: OptAction): PlaylistRow[] {
  switch (a.type) {
    case "video":
      return state.map((p) =>
        p.videos.some((v) => v.id === a.id) ? { ...p, videos: p.videos.map((v) => (v.id === a.id ? { ...v, ...a.patch } : v)) } : p,
      )
    case "removeVideo":
      return state.map((p) => ({ ...p, videos: p.videos.filter((v) => v.id !== a.id) }))
    case "playlist":
      return state.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p))
    case "confirm":
      return state.map((p) =>
        p.id === a.id ? { ...p, videos: p.videos.map((v) => (v.match_status === "oneri" ? { ...v, match_status: "onaylandi" } : v)) } : p,
      )
    case "removePlaylist":
      return state.filter((p) => p.id !== a.id)
  }
}

const STATUS_ORDER: Record<PlaylistStatus, number> = { aktif: 0, duraklatildi: 1, tamamlandi: 2 }

export function VideoModule({
  playlists,
  subjects,
  topicsBySubject,
  suggestions,
  stats,
  planContext,
}: {
  playlists: PlaylistRow[]
  subjects: { id: string; name: string }[]
  topicsBySubject: Record<string, Topic[]>
  suggestions: VideoSuggestion[]
  stats: (TeacherStat & { teacher_name: string })[]
  planContext: PlanContext
}) {
  const [items, apply] = useOptimistic(playlists, reduce)
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [fixing, setFixing] = useState<{ playlistId: string; url: string } | null>(null)
  const [planning, setPlanning] = useState<PlaylistRow | null>(null)

  /** Optimistic değişiklik + server action; hata olursa toast (state sunucudan geri gelir). */
  function run(action: OptAction, call: () => Promise<{ success: boolean; error?: string }>, onOk?: () => void) {
    startTransition(async () => {
      apply(action)
      const res = await call()
      if (!res.success) toast.error(res.error ?? "Bir hata oluştu, tekrar deneyin.")
      else onOk?.()
    })
  }

  const handlers: PlaylistHandlers = {
    toggleWatched(video) {
      const watched = video.watch_status !== "izlendi"
      startTransition(async () => {
        apply({
          type: "video",
          id: video.id,
          patch: { watch_status: watched ? "izlendi" : "izlenmedi", watched_at: watched ? new Date().toISOString() : null },
        })
        const res = await markVideo(video.id, { watched })
        if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
        if (res.data?.learned && video.topic_name) toast.success(`${video.topic_name}: konu anlatımı tamamlandı, soru çözümüne geçebilirsin.`)
      })
    },
    setTopic(video, topic) {
      run({ type: "video", id: video.id, patch: { topic_id: topic?.id ?? null, topic_name: topic?.name ?? null, match_status: topic ? "onaylandi" : "eslesmedi" } }, () =>
        setVideoTopic(video.id, topic?.id ?? null),
      )
    },
    setNote(video, note) {
      run({ type: "video", id: video.id, patch: { note: note.trim() || null } }, () => setVideoNote(video.id, note))
    },
    deleteVideo(video) {
      if (!confirm(`"${video.title}" listeden kaldırılsın mı?`)) return
      run({ type: "removeVideo", id: video.id }, () => deleteVideo(video.id))
    },
    setStatus(playlist, status) {
      run({ type: "playlist", id: playlist.id, patch: { status } }, () => updatePlaylist(playlist.id, { status }))
    },
    rename(playlist, title) {
      run({ type: "playlist", id: playlist.id, patch: { title } }, () => updatePlaylist(playlist.id, { title }))
    },
    confirmAll(playlist) {
      run({ type: "confirm", id: playlist.id }, () => confirmPlaylistSuggestions(playlist.id), () => toast.success("Eşleşmeler onaylandı."))
    },
    async reviewSuggestions(playlist, approve, reject) {
      const res = await reviewVideoSuggestions(playlist.id, { approve, reject })
      if (!res.success) return void toast.error(res.error ?? "Kaydedilemedi.")
      const { approved = 0, rejected = 0 } = res.data ?? {}
      toast.success([approved && `${approved} eşleşme onaylandı`, rejected && `${rejected} öneri reddedildi`].filter(Boolean).join(", ") + ".")
    },
    async refresh(playlist) {
      const res = await refreshPlaylist(playlist.id)
      if (!res.success) return void toast.error(res.error ?? "Yenilenemedi.")
      const { added = 0, updated = 0 } = res.data ?? {}
      toast.success(added || updated ? `${added} yeni video eklendi, ${updated} video güncellendi.` : "Playlist güncel.")
    },
    deletePlaylist(playlist) {
      if (!confirm(`"${playlistDisplayName(playlist)}" ve izleme işaretlerin silinsin mi?`)) return
      run({ type: "removePlaylist", id: playlist.id }, () => deletePlaylist(playlist.id))
    },
    fix(playlist) {
      setFixing({ playlistId: playlist.id, url: channelUrlOf(playlist) ?? "" })
    },
    editPlan(playlist) {
      setPlanning(playlist)
    },
    async shift(playlist) {
      const res = await shiftVideoPlan(playlist.id)
      if (!res.success) return void toast.error(res.error ?? "Kaydırılamadı.")
      toast.success(res.data?.moved ? `Kalan plan kaydırıldı (${res.data.moved} gün yeniden tarihlendi).` : "Plan zaten güncel.")
    },
  }

  const sorted = useMemo(
    () =>
      items
        .map((p, i) => ({ p, i }))
        .sort((a, b) => STATUS_ORDER[effectiveStatus(a.p)] - STATUS_ORDER[effectiveStatus(b.p)] || a.i - b.i)
        .map((x) => x.p),
    [items],
  )
  const subjectRows = useMemo(() => summarizeBySubject(items), [items])
  const today = useMemo(() => watchedOnDay(items, istanbulDateStr()), [items])
  const activity = useMemo(() => videoActivity(items, 7), [items])
  const watchedIds = useMemo(
    () => new Set(items.flatMap((p) => p.videos.filter((v) => v.watch_status === "izlendi").map((v) => v.id))),
    [items],
  )
  const liveSuggestions = suggestions.filter((s) => !watchedIds.has(s.video.id))

  return (
    <section className="space-y-4" aria-labelledby="video-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-red-600" />
          <h2 id="video-heading" className="text-lg font-semibold text-zinc-900">
            Video takibim
          </h2>
        </div>
        {items.length > 0 && (
          <Button variant="accent" onClick={() => setAdding(true)} className="h-10">
            <Plus className="h-4 w-4" /> Video ekle
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-zinc-900">Ders bazlı ilerleme</h3>
              <VideoSubjectTable rows={subjectRows} />
            </div>
            <TodayCard count={today.count} seconds={today.seconds} />
          </div>

          {liveSuggestions.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-[#F97316]/25 bg-orange-50/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Lightbulb className="h-4 w-4 text-[#F97316]" /> Ne izlemeliyim?
              </div>
              <ol className="space-y-2">
                {liveSuggestions.map((s, i) => (
                  <li key={s.video.id} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                      {i + 1}
                    </span>
                    <a
                      href={youtubeWatchUrl(s.video.youtube_video_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <span className="block truncate text-sm font-medium text-zinc-900 hover:text-[#1B6B8A]">{s.video.title}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {s.subjectName} · {s.playlistName}
                        {s.video.duration_seconds != null && ` · ${formatClock(s.video.duration_seconds)}`}
                      </span>
                      <span className="block text-xs text-[#c2410c]">{s.reasons.join(" · ")}</span>
                    </a>
                    <a
                      href={youtubeWatchUrl(s.video.youtube_video_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube'da aç"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button size="sm" variant="outline" className="h-10 shrink-0" onClick={() => handlers.toggleWatched(s.video)}>
                      <Check className="h-4 w-4" /> <span className="hidden sm:inline">İzledim</span>
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <VideoActivityChart data={activity.data} series={activity.series} />

          {stats.length > 0 && <TeacherStatsCard stats={stats} />}

          <div className="space-y-3">
            {sorted.map((p) => (
              <VideoPlaylistCard key={p.id} playlist={p} topics={topicsBySubject[p.subject_id] ?? []} handlers={handlers} />
            ))}
          </div>
        </>
      )}

      {adding && <VideoAddDialog open onOpenChange={setAdding} subjects={subjects} planContext={planContext} />}
      {fixing && (
        <VideoAddDialog open onOpenChange={(o) => !o && setFixing(null)} subjects={subjects} planContext={planContext} fix={fixing} />
      )}
      {planning && <PlanDialog playlist={planning} planContext={planContext} onOpenChange={(o) => !o && setPlanning(null)} />}
    </section>
  )
}

function TodayCard({ count, seconds }: { count: number; seconds: number }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Bugün izlediklerim</h3>
      <div className="flex items-end gap-6">
        <div>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Video className="h-3.5 w-3.5" /> Video
          </div>
          <div className="text-3xl font-bold tabular-nums text-zinc-900">{count}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> Süre
          </div>
          <div className="text-3xl font-bold tabular-nums text-[#F97316]">{formatSpan(seconds)}</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        {count === 0 ? "Bugün henüz video işaretlemedin." : "İzlediğin videoları işaretledikçe günlük özetin güncellenir."}
      </p>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <ListVideo className="h-6 w-6 text-red-600" />
      </span>
      <div className="max-w-md space-y-1">
        <h3 className="font-semibold text-zinc-900">Konu anlatımı videolarını buradan takip et</h3>
        <p className="text-sm text-zinc-500">
          İzlediğin YouTube playlist&apos;ini ya da tekli videoyu ekle. Videolar konularınla eşleşir; izledikçe işaretle, ilerlemen
          Konularım&apos;a ve programına yansısın.
        </p>
      </div>
      <Button variant="accent" onClick={onAdd} className="h-11">
        <Plus className="h-4 w-4" /> İlk playlist&apos;ini ekle
      </Button>
    </div>
  )
}

function TeacherStatsCard({ stats }: { stats: (TeacherStat & { teacher_name: string })[] }) {
  const enough = stats.filter((s) => s.enoughData && s.accuracy !== null)
  return (
    <div className="space-y-2 rounded-2xl border border-[#1B6B8A]/20 bg-[#1B6B8A]/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <TrendingUp className="h-4 w-4 text-[#1B6B8A]" /> Hangi hocadan daha verimli öğreniyorsun?
      </div>
      {enough.length > 0 && (
        <p className="text-sm text-zinc-700">
          {enough
            .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
            .map((s) => `${s.teacher_name} videolarıyla çalıştığın konularda doğruluğun %${s.accuracy}`)
            .join("; ")}
          .
        </p>
      )}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stats.map((s) => (
          <li key={s.playlist_id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
            <div className="font-medium text-zinc-900">{s.teacher_name}</div>
            {s.enoughData ? (
              <div className="tabular-nums">
                Sonrasında çözdüğün {s.questions} soruda doğruluk %{s.accuracy}
                {s.understoodRate !== null && ` · "Anladım" oranı %${s.understoodRate}`}
              </div>
            ) : (
              <div>
                Yetersiz veri ({s.questions} soru){s.understoodRate !== null && ` · "Anladım" oranı %${s.understoodRate}`}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
