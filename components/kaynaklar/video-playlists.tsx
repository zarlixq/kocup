"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCheck, ListVideo, Loader2, PlayCircle, Plus, Trash2, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchCombobox } from "@/components/soru-cozum/search-combobox"
import type { PlaylistRow, VideoRow } from "@/lib/resources/videos"
import type { TeacherStat } from "@/lib/resources/video-match"
import {
  addPlaylist,
  confirmPlaylistSuggestions,
  deletePlaylist,
  setVideoTopic,
} from "@/app/ogrenci/kaynaklarim/video-actions"

type Topic = { id: string; name: string }

export function VideoPlaylists({
  playlists,
  subjects,
  topicsBySubject,
  youtubeEnabled,
  stats,
}: {
  playlists: PlaylistRow[]
  subjects: { id: string; name: string }[]
  topicsBySubject: Record<string, Topic[]>
  youtubeEnabled: boolean
  stats: (TeacherStat & { teacher_name: string })[]
}) {
  const [adding, setAdding] = useState(playlists.length === 0)
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-zinc-900">Video playlist&apos;lerim</h2>
        </div>
        {!adding && (
          <Button size="sm" variant="accent" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Playlist ekle
          </Button>
        )}
      </div>
      <p className="text-sm text-zinc-500">
        Ders bazında izlediğin konu anlatımı listelerini ekle; videolar konularla eşleşir, Konularım&apos;da ve programdaki konu
        çalışması bloğunda görünür. Videolar YouTube&apos;da açılır.
      </p>

      {adding && <AddPlaylistForm subjects={subjects} youtubeEnabled={youtubeEnabled} onDone={() => setAdding(false)} />}

      {stats.length > 0 && <TeacherStatsCard stats={stats} />}

      {playlists.map((p) => (
        <PlaylistCard key={p.id} playlist={p} topics={topicsBySubject[p.subject_id] ?? []} />
      ))}
    </section>
  )
}

function AddPlaylistForm({
  subjects,
  youtubeEnabled,
  onDone,
}: {
  subjects: { id: string; name: string }[]
  youtubeEnabled: boolean
  onDone: () => void
}) {
  const [subjectId, setSubjectId] = useState("")
  const [teacher, setTeacher] = useState("")
  const [url, setUrl] = useState("")
  const [manual, setManual] = useState(!youtubeEnabled)
  const [list, setList] = useState("")
  const [pending, start] = useTransition()

  function submit() {
    start(async () => {
      const res = await addPlaylist({ subjectId, teacherName: teacher, url: manual ? "" : url, manualList: manual ? list : "" })
      if (!res.success) return void toast.error(res.error ?? "Eklenemedi.")
      toast.success(`${res.data?.videos ?? 0} video eklendi, ${res.data?.matched ?? 0} tanesi bir konuyla eşleşti. Eşleşmeleri kontrol et.`)
      onDone()
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
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
          <Label htmlFor="pl-teacher">Hoca / kanal</Label>
          <Input id="pl-teacher" value={teacher} maxLength={80} onChange={(e) => setTeacher(e.target.value)} placeholder="ör. Bıyıklı Matematik" />
        </div>
      </div>
      {!manual ? (
        <div className="space-y-1.5">
          <Label htmlFor="pl-url">YouTube playlist linki</Label>
          <Input id="pl-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="pl-list">Videolar (her satıra bir YouTube linki ve başlığı)</Label>
          <Textarea
            id="pl-list"
            rows={6}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"https://youtu.be/… Ardışık Sayılar 1\nhttps://youtu.be/… Ardışık Sayılar 2"}
          />
          {!youtubeEnabled && (
            <p className="text-xs text-zinc-500">YouTube bağlantısı kurulu değil; videoları elle listele (başlık, konu eşleşmesi için kullanılır).</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {youtubeEnabled ? (
          <button type="button" onClick={() => setManual((m) => !m)} className="text-xs font-medium text-[#1B6B8A] hover:underline">
            {manual ? "Playlist linkiyle ekle" : "Videoları elle listele"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="accent" size="sm" onClick={submit} disabled={pending || !subjectId || !teacher.trim()}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Ekle
          </Button>
        </div>
      </div>
    </div>
  )
}

function PlaylistCard({ playlist, topics }: { playlist: PlaylistRow; topics: Topic[] }) {
  const [pending, start] = useTransition()
  const suggestions = playlist.videos.filter((v) => v.match_status === "oneri").length
  const watched = playlist.videos.filter((v) => v.watch_status === "izlendi").length

  function confirmAll() {
    start(async () => {
      const res = await confirmPlaylistSuggestions(playlist.id)
      if (!res.success) return void toast.error(res.error ?? "Onaylanamadı.")
      toast.success(`${res.data?.count ?? 0} eşleşme onaylandı.`)
    })
  }
  function remove() {
    if (!confirm(`${playlist.teacher_name} playlist'i ve izleme işaretlerin silinsin mi?`)) return
    start(async () => {
      const res = await deletePlaylist(playlist.id)
      if (!res.success) toast.error(res.error ?? "Silinemedi.")
    })
  }

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white" open={suggestions > 0}>
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3">
        <PlayCircle className="h-4 w-4 text-red-600" />
        <span className="font-semibold text-zinc-900">{playlist.teacher_name}</span>
        <span className="text-xs text-zinc-500">
          {playlist.subject_name} · {playlist.videos.length} video · {watched} izlendi
        </span>
        {suggestions > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{suggestions} eşleşme onay bekliyor</span>
        )}
      </summary>
      <div className="space-y-2 border-t border-zinc-100 p-3">
        <div className="flex flex-wrap justify-end gap-2">
          {suggestions > 0 && (
            <Button size="sm" variant="outline" onClick={confirmAll} disabled={pending}>
              <CheckCheck className="h-4 w-4" /> Önerileri onayla
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-red-600" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" /> Sil
          </Button>
        </div>
        <ul className="divide-y divide-zinc-100">
          {playlist.videos.map((v) => (
            <VideoMatchRow key={v.id} video={v} topics={topics} />
          ))}
        </ul>
      </div>
    </details>
  )
}

function VideoMatchRow({ video, topics }: { video: VideoRow; topics: Topic[] }) {
  const [pending, start] = useTransition()
  function choose(topicId: string | null) {
    start(async () => {
      const res = await setVideoTopic(video.id, topicId)
      if (!res.success) toast.error(res.error ?? "Kaydedilemedi.")
    })
  }
  return (
    <li className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[1fr_16rem]">
      <a
        href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 truncate text-sm text-zinc-800 hover:text-[#1B6B8A] hover:underline"
        title={video.title}
      >
        {video.position + 1}. {video.title}
      </a>
      <div className="flex items-center gap-1.5">
        <div className={cn("min-w-0 flex-1", pending && "opacity-60")}>
          <SearchCombobox
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
            value={video.topic_id}
            onChange={choose}
            placeholder="Konu seç…"
            searchPlaceholder="Konu ara…"
            clearable
          />
        </div>
        {video.match_status === "oneri" && (
          <button
            type="button"
            onClick={() => choose(video.topic_id)}
            disabled={pending}
            className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
            title="Otomatik eşleşmeyi onayla"
          >
            Onayla
          </button>
        )}
      </div>
    </li>
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
