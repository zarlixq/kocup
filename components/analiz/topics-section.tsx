import { Crosshair, PlayCircle, Sprout, TrendingUp, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { loadSubjects, loadTopics, type TopicStat } from "@/lib/analytics/analiz/load"
import { youtubeWatchUrl } from "@/lib/resources/videos"
import { safeLoad, Card, NotEnough, SectionCard, SectionError, pct, successTone, type AnalizCtx } from "@/components/analiz/section"
import { AddToProgramButton } from "@/components/analiz/add-to-program-button"

/** "En zayıf" listesine girmek için gereken en az soru. */
export const WEAK_MIN_QUESTIONS = 10
/** "Gelişen" için dönemin her iki yarısında en az soru. */
const IMPROVING_MIN_QUESTIONS = 5

const STATUS_LABEL: Record<string, string> = { basla: "Başlanmadı", devam: "Devam ediyor", tamam: "Tamamlandı", tekrar: "Tekrar" }

function VideoCell({ t }: { t: TopicStat }) {
  if (t.videos_total === 0) return <span className="text-zinc-400">—</span>
  const all = t.videos_watched === t.videos_total
  return (
    <span className={cn("tabular-nums", all ? "text-emerald-700" : "text-zinc-700")}>
      {all ? "✓ " : ""}
      {t.videos_watched}/{t.videos_total}
    </span>
  )
}

function TopicActions({ t, ctx }: { t: TopicStat; ctx: AnalizCtx }) {
  if (!t.next_video_id && ctx.mode !== "student") return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {t.next_video_id && (
        <a
          href={youtubeWatchUrl(t.next_video_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#F97316] px-2.5 text-xs font-medium text-white hover:bg-[#ea6c10]"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Videosunu izle
        </a>
      )}
      {ctx.mode === "student" && <AddToProgramButton topicId={t.topic_id} topicName={t.topic_name} />}
    </div>
  )
}

export async function TopicsSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("TopicsSection", async () => {
    const subjects = await loadSubjects(ctx.studentId, ctx.from, ctx.to)
    const subjectId =
    ctx.detailSubjectId ?? ctx.subjectId ?? [...subjects].sort((a, b) => b.questions - a.questions)[0]?.subject_id ?? null
    const topics = subjectId ? await loadTopics(ctx.studentId, ctx.from, ctx.to, subjectId, ctx.split) : []
    return { subject: subjects.find((s) => s.subject_id === subjectId), subjectId, topics }
  })
  if (!loaded) return <SectionError title="Konu analizi" />
  const { subject, subjectId, topics } = loaded
  if (!subjectId) return null

  const weak = topics
    .filter((t) => t.questions >= WEAK_MIN_QUESTIONS)
    .map((t) => ({ t, acc: pct(t.correct, t.questions) ?? 0 }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5)
  const untouched = topics.filter((t) => t.in_target && t.questions_all === 0 && t.videos_watched === 0)
  const improving = topics
    .filter((t) => t.q_recent >= IMPROVING_MIN_QUESTIONS && t.q_before >= IMPROVING_MIN_QUESTIONS)
    .map((t) => ({ t, delta: Math.round((t.c_recent / t.q_recent - t.c_before / t.q_before) * 100) }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
  const shown = topics.filter((t) => t.questions > 0 || t.wrong_book > 0 || t.videos_total > 0 || t.konu_status || t.in_target)

  return (
    <SectionCard
      id="konu-analizi"
      title={`Konu analizi${subject ? ` · ${subject.subject_name}` : ""}`}
      icon={<Crosshair className="h-5 w-5 text-[#F97316]" />}
      description="Ders analizi tablosundan başka bir ders seçerek değiştirebilirsin."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="En zayıf 5 konu">
          {weak.length === 0 ? (
            <NotEnough>En az {WEAK_MIN_QUESTIONS} soru çözdüğün konular olunca zayıf konuların burada listelenir.</NotEnough>
          ) : (
            <ol className="space-y-3">
              {weak.map(({ t, acc }) => (
                <li key={t.topic_id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <span className="font-medium text-zinc-900">
                      <TriangleAlert className="mr-1 inline h-3.5 w-3.5 text-red-500" aria-hidden />
                      {t.topic_name}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", successTone(acc))}>%{acc}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {t.questions} soru{t.wrong_book ? ` · yanlış defterinde ${t.wrong_book}` : ""}
                    {t.videos_total > 0 && t.videos_watched < t.videos_total ? " · izlenmemiş video var" : ""}
                  </div>
                  <TopicActions t={t} ctx={ctx} />
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Hiç dokunulmamış konular">
          {untouched.length === 0 ? (
            <NotEnough>Hedefindeki konuların hepsine en az bir kez dokunmuşsun.</NotEnough>
          ) : (
            <ul className="space-y-2">
              {untouched.slice(0, 8).map((t) => (
                <li key={t.topic_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-800">
                    <Sprout className="h-3.5 w-3.5 text-zinc-400" aria-hidden /> {t.topic_name}
                  </span>
                  <TopicActions t={t} ctx={ctx} />
                </li>
              ))}
              {untouched.length > 8 && <li className="text-xs text-zinc-500">+{untouched.length - 8} konu daha</li>}
            </ul>
          )}
        </Card>
        <Card title="Gelişen konular">
          {improving.length === 0 ? (
            <NotEnough>Dönemin iki yarısında da soru çözdüğün konulardaki gelişim burada görünür.</NotEnough>
          ) : (
            <ul className="space-y-2">
              {improving.map(({ t, delta }) => (
                <li key={t.topic_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-zinc-800">{t.topic_name}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-emerald-700">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden /> +{delta} puan
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        {shown.length === 0 ? (
          <NotEnough>Bu derste konu verisi yok.</NotEnough>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-3 py-2.5 font-medium">Konu</th>
                <th className="px-3 py-2.5 font-medium">Çözülen soru</th>
                <th className="px-3 py-2.5 font-medium">Başarı</th>
                <th className="px-3 py-2.5 font-medium">Yanlış defteri</th>
                <th className="px-3 py-2.5 font-medium">Video</th>
                <th className="px-3 py-2.5 font-medium">Konularım</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((t) => {
                const acc = pct(t.correct, t.questions)
                return (
                  <tr key={t.topic_id}>
                    <td className="px-3 py-2 text-zinc-900">
                      {t.topic_name}
                      {t.in_target && <span className="ml-1.5 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-[#F97316]">hedef</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.questions || "—"}</td>
                    <td className="px-3 py-2">
                      {acc === null ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", successTone(acc))}>%{acc}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{t.wrong_book || "—"}</td>
                    <td className="px-3 py-2">
                      <VideoCell t={t} />
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">{t.konu_status ? (STATUS_LABEL[t.konu_status] ?? t.konu_status) : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </SectionCard>
  )
}
