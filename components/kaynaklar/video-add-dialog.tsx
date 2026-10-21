"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, ListVideo, Loader2, PlayCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatClock, formatSpan, parseYoutubeLink } from "@/lib/resources/video-match"
import { addVideoSource, previewVideoLink, type LinkPreview } from "@/app/ogrenci/kaynaklarim/video-actions"

const LINK_HINT: Record<string, string> = {
  channel: "Kanal linki eklenemez, playlist veya video linki gir.",
  invalid: "Geçerli bir YouTube playlist veya video linki gir.",
}

// Üst bileşen yalnız açıkken render eder → her açılışta temiz form.
export function VideoAddDialog({
  open,
  onOpenChange,
  subjects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: { id: string; name: string }[]
}) {
  const [url, setUrl] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [title, setTitle] = useState("")
  const [teacher, setTeacher] = useState("")
  const [manualList, setManualList] = useState("")
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [previewing, startPreview] = useTransition()
  const [saving, startSave] = useTransition()

  const link = url.trim() ? parseYoutubeLink(url) : null
  const linkError = link && (link.kind === "channel" || link.kind === "invalid") ? LINK_HINT[link.kind] : null

  function runPreview(value: string) {
    const l = parseYoutubeLink(value)
    if (l.kind === "channel" || l.kind === "invalid") return setPreview(null)
    startPreview(async () => {
      const res = await previewVideoLink(value)
      if (!res.success || !res.data) {
        setPreview(null)
        return void toast.error(res.error ?? "Link okunamadı.")
      }
      setPreview(res.data)
      if (res.data.kind === "playlist") {
        setTitle(res.data.title ?? "")
        setTeacher(res.data.channel ?? "")
      } else if (res.data.kind === "video") {
        setTitle(res.data.title)
        setTeacher(res.data.channel ?? "")
      }
    })
  }

  function submit() {
    startSave(async () => {
      const manual = preview?.kind === "playlist_manual"
      const res = await addVideoSource({
        subjectId,
        url: manual ? "" : url,
        title,
        teacherName: teacher,
        manualList: manual ? manualList : "",
      })
      if (!res.success || !res.data) return void toast.error(res.error ?? "Eklenemedi.")
      if (res.data.kind === "video") toast.success("Video eklendi.")
      else
        toast.success(
          `${res.data.videos} video eklendi${res.data.matched ? `, ${res.data.matched} tanesi bir konuyla eşleşti — kontrol et` : ""}.`,
        )
      onOpenChange(false)
    })
  }

  const alreadyAdded = preview && preview.kind !== "playlist_manual" && preview.alreadyAdded
  const canSubmit =
    !!subjectId &&
    !!preview &&
    !alreadyAdded &&
    (preview.kind !== "playlist_manual" || (manualList.trim().length > 0 && title.trim().length > 0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Video ekle</DialogTitle>
          <DialogDescription>YouTube playlist ya da tekli video linkini yapıştır; tipi otomatik algılanır.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="video-url">YouTube linki</Label>
            <div className="flex gap-2">
              <Input
                id="video-url"
                value={url}
                inputMode="url"
                autoFocus
                onChange={(e) => {
                  setUrl(e.target.value)
                  setPreview(null)
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
                placeholder="https://www.youtube.com/playlist?list=… ya da watch?v=…"
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
              <p className="text-xs text-zinc-500">{link.kind === "playlist" ? "Playlist linki algılandı." : "Tekli video linki algılandı."}</p>
            ) : null}
          </div>

          {preview && <PreviewCard preview={preview} />}

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
              <p className="text-xs text-zinc-500">
                YouTube API anahtarı tanımlı olmadığı için playlist otomatik okunamıyor. Video linklerini sırayla yapıştır; başlıkları
                otomatik çekilir.
              </p>
            </div>
          )}

          {preview && (
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
                <Label htmlFor="video-title">{preview.kind === "video" ? "Video adı" : "Playlist adı"}</Label>
                <Input id="video-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
              </div>
              {preview.kind !== "video" && (
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
          {preview?.kind === "video" && (
            <p className="text-xs text-zinc-500">Tekli videolar seçtiğin dersin &quot;Tekli videolar&quot; grubuna eklenir.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Vazgeç
          </Button>
          <Button variant="accent" onClick={submit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PreviewCard({ preview }: { preview: LinkPreview }) {
  if (preview.kind === "playlist_manual") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <ListVideo className="mt-0.5 h-4 w-4 shrink-0" />
        Playlist linki algılandı ama otomatik okuma kapalı. Videoları aşağıya elle ekleyebilirsin.
      </div>
    )
  }
  const meta =
    preview.kind === "playlist"
      ? [
          `${preview.videoCount} video`,
          preview.totalSeconds != null ? `toplam ${formatSpan(preview.totalSeconds)}` : null,
          preview.channel,
        ]
      : [preview.durationSeconds != null ? formatClock(preview.durationSeconds) : null, preview.channel]
  return (
    <div className="space-y-2">
      <div className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
        {preview.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.thumbnailUrl} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-zinc-200">
            <PlayCircle className="h-6 w-6 text-zinc-400" />
          </div>
        )}
        <div className="min-w-0 text-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {preview.kind === "playlist" ? "Playlist" : "Tekli video"}
          </div>
          <div className="line-clamp-2 font-medium text-zinc-900">{preview.title ?? "Adsız playlist"}</div>
          <div className="text-xs text-zinc-500">{meta.filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      {preview.alreadyAdded && (
        <p className="flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {preview.kind === "playlist" ? "Bu playlist zaten ekli. Yeni videolar için kartındaki Yenile'yi kullan." : "Bu video zaten ekli."}
        </p>
      )}
    </div>
  )
}
