import { ListVideo } from "lucide-react"
import { VideoSubjectTable } from "@/components/kaynaklar/video-subject-table"
import { VideoActivityChart } from "@/components/kaynaklar/video-activity-chart"
import { formatSpan } from "@/lib/resources/video-match"
import type { PlaylistRow } from "@/lib/resources/videos"
import { summarizeBySubject, videoActivity, watchedOnDay } from "@/lib/resources/video-summary"
import { istanbulDateStr } from "@/lib/tz"

// Koç (ve kurum) görünümü: öğrencinin video takibinin salt okunur özeti.
export function VideoProgressReadonly({ playlists }: { playlists: PlaylistRow[] }) {
  const rows = summarizeBySubject(playlists)
  const activity = videoActivity(playlists, 7)
  const week = activity.data.reduce(
    (acc, d) => {
      for (const s of activity.series) {
        acc.count += Number(d[`c_${s.key}`] ?? 0)
        acc.min += Number(d[`m_${s.key}`] ?? 0)
      }
      return acc
    },
    { count: 0, min: 0 },
  )
  const today = watchedOnDay(playlists, istanbulDateStr())

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ListVideo className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold text-zinc-900">Video takibi</h2>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
          Öğrenci henüz video playlist&apos;i eklemedi.
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">Ders bazlı izleme ilerlemesi</h3>
              <span className="text-xs tabular-nums text-zinc-500">
                Son 7 gün: {week.count} video{week.min > 0 ? ` · ${formatSpan(week.min * 60)}` : ""} · Bugün: {today.count} video
              </span>
            </div>
            <VideoSubjectTable rows={rows} />
          </div>
          <VideoActivityChart data={activity.data} series={activity.series} title="Son 7 Günlük Video Aktivitesi" />
        </>
      )}
    </section>
  )
}
