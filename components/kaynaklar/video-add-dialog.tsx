"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, ListVideo, Loader2, PlayCircle, Search, Tv } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlanSettings, defaultPlanDraft, planPayload, type PlanDraft } from "@/components/kaynaklar/plan-settings"
import { formatClock, formatSpan, parseYoutubeLink } from "@/lib/resources/video-match"
import { formatDateTr } from "@/lib/resources/playlist-plan"
import {
  addVideoSource,
  fixPlaylistSource,
  previewVideoLink,
  type LinkPreview,
  type PlaylistPreview,
  type VideoPreview,
} from "@/app/ogrenci/kaynaklarim/video-actions"

const INVALID_HINT = "Geçerli bir YouTube playlist, video ya da kanal linki gir."

const KIND_HINT: Record<string, string> = {
  playlist: "Playlist linki algılandı.",
  video: "Tekli video linki algılandı.",
  video_in_playlist: "Playlist içindeki bir video algılandı.",
  channel: "Kanal linki algılandı — kanalın playlist'leri listelenecek.",
}

const playlistUrl = (id: string) => `https://www.youtube.com/playlist?list=${id}`

export type PlanContext = {
  today: string
  /** UpPlan müsaitliğinden varsayılan çalışma günleri. */
  weekdays: number[]
  /** Hafta günü → müsait dakika (UpPlan ızgarası yoksa null). */
  availability: Record<number, number> | null
}

// Üst bileşen yalnız açıkken render eder → her açılışta temiz form.
export function VideoAddDialog({
  open,
  onOpenChange,
  subjects,
  planContext,
  fix,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: { id: string; name: string }[]
  planContext: PlanContext
  /** Eksik kaydı düzelt: kanal linkiyle eklenmiş kartı bir playlist'e bağlar. */
  fix?: { playlistId: string; url: string }
}) {
  const [url, setUrl] = useState(fix?.url ?? "")
  const [subjectId, setSubjectId] = useState("")
  const [title, setTitle] = useState("")
  const [teacher, setTeacher] = useState("")
  const [manualList, setManualList] = useState("")
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  /** Kanal listesinden seçilen playlist'in önizlemesi. */
  const [picked, setPicked] = useState<PlaylistPreview | null>(null)
  const [only, setOnly] = useState<"playlist" | "video">("playlist")
  const [plan, setPlan] = useState<PlanDraft>(() => defaultPlanDraft(planContext))
  const [previewing, startPreview] = useTransition()
  const [picking, setPicking] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  const link = url.trim() ? parseYoutubeLink(url) : null
  const linkError = link?.kind === "invalid" ? INVALID_HINT : null

  const playlist: PlaylistPreview | null =
    preview?.kind === "playlist"
      ? preview
      : preview?.kind === "video_in_playlist" && only === "playlist"
        ? preview.playlist
        : preview?.kind === "channel"
          ? picked
          : null
  const video: VideoPreview | null =
    preview?.kind === "video" ? preview : preview?.kind === "video_in_playlist" && (only === "video" || !preview.playlist) ? preview.video : null

  function applyPlaylistDefaults(p: PlaylistPreview) {
    setTitle(p.title ?? "")
    setTeacher(p.channel ?? "")
    setPlan(defaultPlanDraft({ ...planContext, dayStructure: p.dayStructure }))
  }

  function runPreview(value: string) {
    const l = parseYoutubeLink(value)
    if (l.kind === "invalid") return setPreview(null)
    setPicked(null)
    startPreview(async () => {
      const res = await previewVideoLink(value)
      if (!res.success || !res.data) {
        setPreview(null)
        return void toast.error(res.error ?? "Link okunamadı.")
      }
      const d = res.data
      setPreview(d)
      setOnly("playlist")
      if (d.kind === "playlist") applyPlaylistDefaults(d)
      else if (d.kind === "video_in_playlist" && d.playlist) applyPlaylistDefaults(d.playlist)
      else if (d.kind === "video") {
        setTitle(d.title)
        setTeacher(d.channel ?? "")
      }
    })
  }

  // Düzelt: kanal linkiyle açılır → playlist'ler hemen listelenir.
  const ran = useRef(false)
  useEffect(() => {
    if (fix?.url && !ran.current) {
      ran.current = true
      runPreview(fix.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function pick(id: string) {
    setPicking(id)
    const res = await previewVideoLink(playlistUrl(id))
    setPicking(null)
    if (!res.success || res.data?.kind !== "playlist") return void toast.error(res.error ?? "Playlist okunamadı.")
    setPicked(res.data)
    applyPlaylistDefaults(res.data)
  }

  function submit() {
    startSave(async () => {
      const payload = playlist ? planPayload(plan) : null
      if (fix) {
        if (!playlist) return
        const res = await fixPlaylistSource(fix.playlistId, { url: playlistUrl(playlist.playlistId), plan: payload })
        if (!res.success) return void toast.error(res.error ?? "Düzeltilemedi.")
        toast.success(`Playlist bağlandı: ${playlist.title ?? "playlist"} (${playlist.videoCount} video).`)
        return onOpenChange(false)
      }
      const manual = preview?.kind === "playlist_manual"
      const res = await addVideoSource({
        subjectId,
        url: manual ? "" : playlist ? playlistUrl(playlist.playlistId) : url,
        title,
        teacherName: teacher,
        manualList: manual ? manualList : "",
        only: playlist ? "playlist" : "video",
        plan: payload,
      })
      if (!res.success || !res.data) return void toast.error(res.error ?? "Eklenemedi.")
      if (res.data.kind === "video") toast.success("Video eklendi.")
      else
        toast.success(
          [
            `${res.data.videos} video eklendi`,
            res.data.matched ? `${res.data.matched} tanesi bir konuyla eşleşti — kontrol et` : null,
            res.data.planEnd ? `plan bitişi ${formatDateTr(res.data.planEnd)}` : null,
          ]
            .filter(Boolean)
            .join(", ") + ".",
        )
      onOpenChange(false)
    })
  }

  const alreadyAdded = (playlist?.alreadyAdded && !fix) || (!playlist && video?.alreadyAdded)
  const planOk = !playlist || !plan.enabled || plan.weekdays.length > 0
  const canSubmit =
    !!preview &&
    !alreadyAdded &&
    planOk &&
    (fix
      ? !!playlist
      : !!subjectId &&
        (preview.kind === "playlist_manual"
          ? manualList.trim().length > 0 && title.trim().length > 0
          : !!playlist || !!video))

  const channelList = preview?.kind === "channel" && !picked ? preview : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fix ? "Kaydı düzelt" : "Video ekle"}</DialogTitle>
          <DialogDescription>
            {fix
              ? "Bu kayıt kanal linkiyle eklenmiş. Kanalın playlist'lerinden doğru olanı seç; izleme işaretlerin korunur."
              : "YouTube playlist, video ya da kanal linkini yapıştır; tipi otomatik algılanır."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="video-url">YouTube linki</Label>
            <div className="flex gap-2">
              <Input
                id="video-url"
                value={url}
                inputMode="url"
                autoFocus={!fix}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setPreview(null)
                  setPicked(null)
                }}
                onPaste={(e) => {
                  const v = e.clipboardData.getData("text")
                  if (v) setTimeout(() => runPreview(v.trim()), 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    runPreview(url)
                  }
                }}
                placeholder="playlist?list=… · watch?v=… · youtube.com/@kanal"
                aria-invalid={!!linkError}
              />
              <Button type="button" variant="outline" onClick={() => runPreview(url)} disabled={!link || !!linkError || previewing}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only">Getir</span>
              </Button>
            </div>
            {linkError ? (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {linkError}
              </p>
            ) : link && !preview && !previewing ? (
              <p className="text-xs text-zinc-500">{KIND_HINT[link.kind]}</p>
            ) : null}
          </div>

          {preview?.kind === "playlist_manual" && <ManualNotice />}

          {channelList && (
            <ChannelPicker channelTitle={channelList.channelTitle} playlists={channelList.playlists} picking={picking} onPick={pick} />
          )}

          {preview?.kind === "channel" && picked && (
            <button type="button" onClick={() => setPicked(null)} className="flex h-9 items-center gap-1 text-xs font-medium text-[#1B6B8A]">
              <ArrowLeft className="h-3.5 w-3.5" /> {preview.channelTitle} playlist&apos;lerine dön
            </button>
          )}

          {preview?.kind === "video_in_playlist" && preview.playlist && !fix && (
            <div className="space-y-1.5" role="radiogroup" aria-label="Ne eklensin">
              <p className="text-sm font-medium text-zinc-900">Bu videonun bulunduğu playlist&apos;i mi eklemek istiyorsun?</p>
              <ChoiceRow
                checked={only === "playlist"}
                onSelect={() => setOnly("playlist")}
                label={`Playlist'in tamamı (${preview.playlist.videoCount} video)`}
                hint={preview.playlist.title ?? undefined}
              />
              <ChoiceRow checked={only === "video"} onSelect={() => setOnly("video")} label="Yalnız bu video" hint={preview.video.title} />
            </div>
          )}
          {preview?.kind === "video_in_playlist" && !preview.playlist && (
            <p className="text-xs text-amber-700">Playlist okunamadı (gizli olabilir); yalnız video eklenecek.</p>
          )}

          {playlist && <PreviewCard kind="playlist" item={playlist} />}
          {!playlist && video && <PreviewCard kind="video" item={video} />}
          {alreadyAdded && (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {playlist ? "Bu playlist zaten ekli. Yeni videolar için kartındaki Yenile'yi kullan." : "Bu video zaten ekli."}
            </p>
          )}

          {preview?.kind === "playlist_manual" && (
            <div className="space-y-1.5">
              <Label htmlFor="video-manual">Playlist videoları (her satıra bir video linki)</Label>
              <Textarea
                id="video-manual"
                rows={5}
                value={manualList}
                onChange={(e) => setManualList(e.target.value)}
                placeholder={"https://youtu.be/…\nhttps://youtu.be/… Türev 2"}
              />
            </div>
          )}

          {!fix && (playlist || video || preview?.kind === "playlist_manual") && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ders</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ders seç" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="video-title">{playlist || preview?.kind === "playlist_manual" ? "Playlist adı" : "Video adı"}</Label>
                <Input id="video-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
              </div>
              {(playlist || preview?.kind === "playlist_manual") && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="video-teacher">Hoca / kanal</Label>
                  <Input
                    id="video-teacher"
                    value={teacher}
                    maxLength={80}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="ör. Bıyıklı Matematik"
                  />
                </div>
              )}
            </div>
          )}
          {!playlist && video && <p className="text-xs text-zinc-500">Tekli videolar seçtiğin dersin &quot;Tekli videolar&quot; grubuna eklenir.</p>}

          {playlist && !alreadyAdded && (
            <PlanSettings
              value={plan}
              onChange={setPlan}
              videos={playlist.videos}
              dayStructure={playlist.dayStructure}
              availability={planContext.availability}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={submit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {fix ? "Bağla" : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManualNotice() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <ListVideo className="mt-0.5 h-4 w-4 shrink-0" />
      Playlist linki algılandı ama otomatik okuma kapalı (YouTube API anahtarı yok). Videoları aşağıya elle ekleyebilirsin.
    </div>
  )
}

function ChoiceRow({ checked, onSelect, label, hint }: { checked: boolean; onSelect: () => void; label: string; hint?: string }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        checked ? "border-[#1B6B8A] bg-[#1B6B8A]/5" : "border-zinc-200",
      )}
    >
      <input type="radio" checked={checked} onChange={onSelect} className="mt-0.5 h-4 w-4 accent-[#1B6B8A]" />
      <span className="min-w-0">
        <span className="block font-medium text-zinc-900">{label}</span>
        {hint && <span className="block truncate text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  )
}

function ChannelPicker({
  channelTitle,
  playlists,
  picking,
  onPick,
}: {
  channelTitle: string
  playlists: { id: string; title: string; itemCount: number; thumbnailUrl: string | null; alreadyAdded: boolean }[]
  picking: string | null
  onPick: (id: string) => void
}) {
  const [q, setQ] = useState("")
  const needle = q.trim().toLocaleLowerCase("tr")
  const shown = needle ? playlists.filter((p) => p.title.toLocaleLowerCase("tr").includes(needle)) : playlists
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
        <Tv className="h-4 w-4 text-red-600" /> {channelTitle} · {playlists.length} playlist
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Playlist ara…" aria-label="Playlist ara" />
      <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!!picking || p.alreadyAdded}
              onClick={() => onPick(p.id)}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 p-2 text-left hover:border-[#1B6B8A] disabled:opacity-60"
            >
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-20 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex aspect-video w-20 shrink-0 items-center justify-center rounded bg-zinc-100">
                  <PlayCircle className="h-5 w-5 text-zinc-400" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium text-zinc-900">{p.title}</span>
                <span className="text-xs text-zinc-500">
                  {p.itemCount} video{p.alreadyAdded && " · zaten ekli"}
                </span>
              </span>
              {picking === p.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />}
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="py-4 text-center text-xs text-zinc-500">Eşleşen playlist yok.</li>}
      </ul>
    </div>
  )
}

function PreviewCard(props: { kind: "playlist"; item: PlaylistPreview } | { kind: "video"; item: VideoPreview }) {
  const meta =
    props.kind === "playlist"
      ? [
          props.item.channel,
          `${props.item.videoCount} video`,
          props.item.totalSeconds != null ? `toplam ${formatSpan(props.item.totalSeconds)}` : null,
        ]
      : [props.item.channel, props.item.durationSeconds != null ? formatClock(props.item.durationSeconds) : null]
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
      {props.item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.item.thumbnailUrl} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-zinc-200">
          <PlayCircle className="h-6 w-6 text-zinc-400" />
        </div>
      )}
      <div className="min-w-0 text-sm">
        <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{props.kind === "playlist" ? "Playlist" : "Tekli video"}</div>
        <div className="line-clamp-2 font-medium text-zinc-900">{props.item.title ?? "Adsız playlist"}</div>
        <div className="text-xs text-zinc-500">{meta.filter(Boolean).join(" · ")}</div>
      </div>
    </div>
  )
}
