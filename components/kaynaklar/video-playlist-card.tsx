"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  RefreshCw,
  StickyNote,
  Trash2,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchCombobox } from "@/components/soru-cozum/search-combobox"
import { formatClock, formatSpan } from "@/lib/resources/video-match"
import {
  playlistDisplayName,
  playlistSubtitle,
  youtubeWatchUrl,
  type PlaylistRow,
  type PlaylistStatus,
  type VideoRow,
} from "@/lib/resources/videos"
import { effectiveStatus, playlistProgress } from "@/lib/resources/video-summary"
import { formatDateTr, offsetLabel, planStatus } from "@/lib/resources/playlist-plan"
import { istanbulDateStr } from "@/lib/tz"
import { PendingMatches } from "@/components/kaynaklar/pending-matches"

type Topic = { id: string; name: string }

export type PlaylistHandlers = {
  toggleWatched: (video: VideoRow) => void
  setTopic: (video: VideoRow, topic: Topic | null) => void
  setNote: (video: VideoRow, note: string) => void
  deleteVideo: (video: VideoRow) => void
  setStatus: (playlist: PlaylistRow, status: PlaylistStatus) => void
  rename: (playlist: PlaylistRow, title: string) => void
  confirmAll: (playlist: PlaylistRow) => void
  refresh: (playlist: PlaylistRow) => Promise<void>
  deletePlaylist: (playlist: PlaylistRow) => void
  /** Eksik kayıt → playlist seç. */
  fix: (playlist: PlaylistRow) => void
  /** Planı kur / düzenle. */
  editPlan: (playlist: PlaylistRow) => void
  /** Geciken plan günlerini bugünden itibaren kaydır. */
  shift: (playlist: PlaylistRow) => Promise<void>
  /** Onay bekleyen eşleşmeler: toplu onay / ret. */
  reviewSuggestions: (playlist: PlaylistRow, approve: string[], reject: string[]) => Promise<void>
}

const STATUS_BADGE: Record<PlaylistStatus, { label: string; cls: string }> = {
  aktif: { label: "Aktif", cls: "bg-[#1B6B8A]/10 text-[#1B6B8A]" },
  duraklatildi: { label: "Duraklatıldı", cls: "bg-zinc-100 text-zinc-600" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700" },
}

export function VideoPlaylistCard({
  playlist,
  topics,
  handlers,
  readonly = false,
}: {
  playlist: PlaylistRow
  topics: Topic[]
  handlers?: PlaylistHandlers
  readonly?: boolean
}) {
  const status = effectiveStatus(playlist)
  const pr = playlistProgress(playlist)
  const [open, setOpen] = useState(status === "aktif")
  const [renaming, setRenaming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  // 'oneri' = güvenli otomatik eşleşme (bağlı); suggested = güvensiz, onay bekliyor (bağlı değil).
  const suggestions = playlist.videos.filter((v) => v.match_status === "oneri").length
  const pending = playlist.videos.filter((v) => v.suggested_topic_id && !v.topic_id)
  const pct = pr.total ? Math.round((pr.watched / pr.total) * 100) : 0
  const name = playlistDisplayName(playlist)
  const remaining =
    pr.total - pr.watched === 0
      ? null
      : pr.remainingUnknown === pr.total - pr.watched
        ? null
        : `kalan ${formatSpan(pr.remainingSeconds)}${pr.remainingUnknown ? "+" : ""}`
  const isTekli = playlist.kind === "tekli"
  const editable = !readonly && !!handlers
  const broken = playlist.issue === "kanal_linki"
  const today = istanbulDateStr()
  const plan = playlist.plan ? planStatus(playlist.videos, today, playlist.plan.weekdays) : null
  const [shifting, setShifting] = useState(false)

  return (
    <article className={cn("rounded-2xl border bg-white", status === "tamamlandi" ? "border-emerald-200" : "border-zinc-200")}>
      <header className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            aria-expanded={open}
          >
            {playlist.thumbnail_url && !isTekli ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={playlist.thumbnail_url} alt="" loading="lazy" className="hidden aspect-video w-24 shrink-0 rounded-lg object-cover sm:block" />
            ) : (
              <span className="hidden aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-red-50 sm:flex">
                <PlayCircle className="h-6 w-6 text-red-600" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#F97316]">{playlist.subject_name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_BADGE[status].cls)}>
                  {STATUS_BADGE[status].label}
                </span>
                {pending.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    {pending.length} eşleşme onay bekliyor
                  </span>
                )}
                {suggestions > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    {suggestions} otomatik eşleşme
                  </span>
                )}
                {broken && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Eksik kayıt</span>
                )}
              </span>
              <span className="mt-1 block truncate font-semibold text-zinc-900" title={name}>
                {name}
              </span>
              <span className="block truncate text-xs text-zinc-500">{playlistSubtitle(playlist)}</span>
            </span>
            <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
          </button>
          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Playlist işlemleri" className="h-10 w-10 shrink-0">
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {broken && (
                  <DropdownMenuItem onSelect={() => handlers.fix(playlist)}>
                    <Wrench className="h-4 w-4" /> Düzelt (playlist seç)
                  </DropdownMenuItem>
                )}
                {!isTekli && !broken && (
                  <DropdownMenuItem onSelect={() => handlers.editPlan(playlist)}>
                    <CalendarDays className="h-4 w-4" /> {playlist.plan ? "Planı düzenle" : "Güne yay (plan)"}
                  </DropdownMenuItem>
                )}
                {!isTekli && !broken && (
                  <DropdownMenuItem
                    disabled={refreshing}
                    onSelect={async () => {
                      setRefreshing(true)
                      await handlers.refresh(playlist)
                      setRefreshing(false)
                    }}
                  >
                    <RefreshCw className="h-4 w-4" /> Yenile
                  </DropdownMenuItem>
                )}
                {!isTekli && (
                  <DropdownMenuItem onSelect={() => setRenaming(true)}>
                    <Pencil className="h-4 w-4" /> Adını düzenle
                  </DropdownMenuItem>
                )}
                {playlist.status !== "aktif" && (
                  <DropdownMenuItem onSelect={() => handlers.setStatus(playlist, "aktif")}>
                    <Play className="h-4 w-4" /> Aktif yap
                  </DropdownMenuItem>
                )}
                {playlist.status !== "duraklatildi" && (
                  <DropdownMenuItem onSelect={() => handlers.setStatus(playlist, "duraklatildi")}>
                    <Pause className="h-4 w-4" /> Duraklat
                  </DropdownMenuItem>
                )}
                {playlist.status !== "tamamlandi" && (
                  <DropdownMenuItem onSelect={() => handlers.setStatus(playlist, "tamamlandi")}>
                    <Check className="h-4 w-4" /> Tamamlandı işaretle
                  </DropdownMenuItem>
                )}
                {suggestions > 0 && (
                  <DropdownMenuItem onSelect={() => handlers.confirmAll(playlist)}>
                    <CheckCheck className="h-4 w-4" /> Otomatik eşleşmeleri onayla
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-700" onSelect={() => handlers.deletePlaylist(playlist)}>
                  <Trash2 className="h-4 w-4" /> Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {renaming && editable && (
          <RenameForm
            initial={name}
            onCancel={() => setRenaming(false)}
            onSave={(t) => {
              handlers.rename(playlist, t)
              setRenaming(false)
            }}
          />
        )}

        {broken && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Bu kayıt kanal linkiyle eklenmiş; playlist&apos;in videoları gelmedi. Kanalın playlist&apos;lerinden doğru olanı seç.
            </span>
            {editable && (
              <Button size="sm" variant="outline" className="h-9 shrink-0 bg-white" onClick={() => handlers.fix(playlist)}>
                <Wrench className="h-4 w-4" /> Düzelt
              </Button>
            )}
          </div>
        )}

        {plan?.planned && status !== "tamamlandi" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            <CalendarClock className="h-4 w-4 shrink-0 text-[#1B6B8A]" />
            <span
              className={cn(
                "font-medium",
                plan.offsetDays < 0 ? "text-red-700" : plan.offsetDays > 0 ? "text-emerald-700" : "text-zinc-900",
              )}
            >
              {offsetLabel(plan.offsetDays)}
            </span>
            <span className="tabular-nums">Tahmini bitiş {formatDateTr(plan.estimatedEnd ?? plan.plannedEnd)}</span>
            {plan.estimatedEnd && plan.plannedEnd && plan.estimatedEnd !== plan.plannedEnd && (
              <span className="tabular-nums text-zinc-400">(plan: {formatDateTr(plan.plannedEnd)})</span>
            )}
            {editable && plan.overdue > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-9 bg-white"
                disabled={shifting}
                onClick={async () => {
                  setShifting(true)
                  await handlers.shift(playlist)
                  setShifting(false)
                }}
              >
                {shifting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Kaydır
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-zinc-600">
            <span className="font-medium tabular-nums text-zinc-900">
              {pr.watched}/{pr.total} izlendi
            </span>
            {remaining && <span className="tabular-nums">{remaining}</span>}
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-zinc-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} ilerleme`}
          >
            <div className={cn("h-full rounded-full", status === "tamamlandi" ? "bg-emerald-500" : "bg-[#F97316]")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {pr.next && status !== "tamamlandi" && (
          <NextUp video={pr.next} onWatched={editable ? () => handlers.toggleWatched(pr.next!) : undefined} />
        )}
      </header>

      {editable && pending.length > 0 && (
        <PendingMatches key={pending.map((v) => v.id).join(",")} videos={pending} onReview={(a, r) => handlers.reviewSuggestions(playlist, a, r)} />
      )}

      {open && (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
          {playlist.videos.map((v) => (
            <VideoItem key={v.id} video={v} topics={topics} handlers={editable ? handlers : undefined} />
          ))}
        </ul>
      )}
    </article>
  )
}

function NextUp({ video, onWatched }: { video: VideoRow; onWatched?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/70 p-2">
      <a
        href={youtubeWatchUrl(video.youtube_video_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white">
          <Play className="h-4 w-4 fill-current" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-[#F97316]">Sıradaki video</span>
          <span className="block truncate text-sm font-medium text-zinc-900">{video.title}</span>
          {video.duration_seconds != null && <span className="text-xs tabular-nums text-zinc-500">{formatClock(video.duration_seconds)}</span>}
        </span>
      </a>
      {onWatched && (
        <Button size="sm" variant="outline" className="h-10 shrink-0" onClick={onWatched}>
          <Check className="h-4 w-4" /> İzledim
        </Button>
      )}
    </div>
  )
}

function RenameForm({ initial, onSave, onCancel }: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onSave(value.trim())
      }}
    >
      <Input value={value} maxLength={200} autoFocus onChange={(e) => setValue(e.target.value)} aria-label="Playlist adı" />
      <Button type="submit" size="sm" className="h-9">
        Kaydet
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onCancel}>
        Vazgeç
      </Button>
    </form>
  )
}

/** Parmakla rahat basılan izledim kutusu (44px dokunma alanı). */
export function WatchToggle({ watched, onToggle, disabled }: { watched: boolean; onToggle?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={watched}
      aria-label={watched ? "İzlendi — geri al" : "İzledim"}
      onClick={onToggle}
      disabled={disabled || !onToggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:cursor-default"
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
          watched ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 bg-white",
        )}
      >
        {watched && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
    </button>
  )
}

function VideoItem({ video, topics, handlers }: { video: VideoRow; topics: Topic[]; handlers?: PlaylistHandlers }) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(video.note ?? "")
  const watched = video.watch_status === "izlendi"
  return (
    <li className="px-2 py-2 sm:px-3">
      <div className="flex items-start gap-1 sm:gap-2">
        <WatchToggle watched={watched} onToggle={handlers ? () => handlers.toggleWatched(video) : undefined} />
        <a
          href={youtubeWatchUrl(video.youtube_video_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-1 hidden shrink-0 sm:block"
          tabIndex={-1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail_url ?? `https://i.ytimg.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
            alt=""
            loading="lazy"
            className={cn("aspect-video w-28 rounded-md object-cover", watched && "opacity-60")}
          />
          {video.duration_seconds != null && (
            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] tabular-nums text-white">
              {formatClock(video.duration_seconds)}
            </span>
          )}
        </a>
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={cn("line-clamp-2 text-sm", watched ? "text-zinc-500" : "font-medium text-zinc-900")} title={video.title}>
                {video.position + 1}. {video.title}
              </div>
              <div className="text-xs tabular-nums text-zinc-500">
                {video.duration_seconds != null && <span className="sm:hidden">{formatClock(video.duration_seconds)} · </span>}
                {watched && video.watched_at
                  ? `İzlendi ${new Date(video.watched_at).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}`
                  : video.planned_date
                    ? `Plan: ${formatDateTr(video.planned_date)}`
                    : video.duration_seconds == null
                      ? "Süre bilinmiyor"
                      : null}
              </div>
            </div>
            <a
              href={youtubeWatchUrl(video.youtube_video_id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube'da aç"
              title="YouTube'da aç"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {handlers ? (
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <SearchCombobox
                  options={topics.map((t) => ({ value: t.id, label: t.name }))}
                  value={video.topic_id}
                  onChange={(id) => handlers.setTopic(video, id ? (topics.find((t) => t.id === id) ?? null) : null)}
                  placeholder="Konu seç…"
                  searchPlaceholder="Konu ara…"
                  clearable
                />
              </div>
            ) : (
              <span className="text-xs text-zinc-600">{video.topic_name ?? "Konu eşleşmedi"}</span>
            )}
            {!video.topic_id && video.suggested_topic_name && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">Öneri: {video.suggested_topic_name} · onay bekliyor</span>
            )}
            {handlers && video.match_status === "oneri" && video.topic_id && (
              <button
                type="button"
                onClick={() => handlers.setTopic(video, topics.find((t) => t.id === video.topic_id) ?? null)}
                className="h-9 shrink-0 rounded-md bg-amber-50 px-2 text-xs font-medium text-amber-700 hover:bg-amber-100"
                title="Otomatik eşleşmeyi onayla"
              >
                Öneriyi onayla
              </button>
            )}
            {handlers && (
              <>
                <button
                  type="button"
                  onClick={() => setNoteOpen((o) => !o)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs hover:bg-zinc-100",
                    video.note ? "text-[#1B6B8A]" : "text-zinc-500",
                  )}
                  aria-expanded={noteOpen}
                >
                  <StickyNote className="h-3.5 w-3.5" /> Not
                </button>
                <button
                  type="button"
                  onClick={() => handlers.deleteVideo(video)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Videoyu kaldır"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
          {video.note && !noteOpen && <p className="rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-600">{video.note}</p>}
          {noteOpen && handlers && (
            <div className="space-y-1.5">
              <Textarea
                rows={2}
                maxLength={500}
                value={note}
                autoFocus
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kısa not (ör. 12. dakikadaki örneği tekrar izle)"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                  Vazgeç
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handlers.setNote(video, note)
                    setNoteOpen(false)
                  }}
                >
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
