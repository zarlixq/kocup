import { notFound } from "next/navigation"
import { Info } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { loadMasteryMap } from "@/lib/upplan/load"
import { MasteryMap } from "@/components/upplan/mastery-map"
import { CoachProgramSuggestion, CoachRoadmapSuggestion } from "@/components/upplan/coach-suggestions"
import type { ProgramDraftView } from "@/components/upplan/program-draft-panel"
import { parsePayload } from "@/lib/upplan/roadmap-service"
import { parseDraftItems } from "@/lib/upplan/program-service"
import { addDaysIso } from "@/lib/upplan/roadmap"
import { istanbulWeekStartStr } from "@/lib/tz"
import { formatDate } from "@/lib/format"

export default async function KocUpplanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bu öğrencinin koçu olduğumuzu doğrula (RLS de zaten süzer).
  const { data: student } = await supabase.from("students").select("coach_id").eq("id", id).maybeSingle()
  if (!student || student.coach_id !== user!.id) notFound()

  const thisWeek = istanbulWeekStartStr()
  const nextWeek = addDaysIso(thisWeek, 7)
  const [data, { data: rm }, { data: drafts }] = await Promise.all([
    loadMasteryMap(supabase, id),
    supabase.from("upplan_roadmaps").select("payload").eq("student_id", id).maybeSingle(),
    supabase.from("upplan_program_drafts").select("week_start, status, items, meta").eq("student_id", id).in("week_start", [thisWeek, nextWeek]),
  ])
  const payload = parsePayload(rm?.payload)
  const weekDraft = (ws: string): ProgramDraftView | null => {
    const d = (drafts ?? []).find((x) => x.week_start === ws)
    if (!d) return null
    const m = (d.meta ?? {}) as { studyMinutes?: number; examCount?: number; unplaced?: number; replaceItemIds?: string[] }
    return {
      status: d.status as ProgramDraftView["status"],
      items: parseDraftItems(d.items),
      studyMinutes: m.studyMinutes ?? 0,
      examCount: m.examCount ?? 0,
      unplaced: m.unplaced ?? 0,
      replaceCount: m.replaceItemIds?.length ?? 0,
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">UpPlan</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500">
          <Info className="h-3.5 w-3.5" />
          Koçlu öğrencide yol haritası ve program öğrenciye doğrudan uygulanmaz; öneri olarak sana gelir. Ustalık haritası salt okunur.
        </p>
      </div>
      <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <CoachRoadmapSuggestion
          studentId={id}
          items={payload?.items ?? null}
          overflow={payload?.overflow?.message ?? null}
          hasProfile={!!data.profile?.completed_at}
        />
        {data.profile?.completed_at && (
          <CoachProgramSuggestion
            studentId={id}
            weeks={[
              { weekStart: thisWeek, label: `Bu hafta (${formatDate(thisWeek, "dd.MM")})`, draft: weekDraft(thisWeek) },
              { weekStart: nextWeek, label: `Gelecek hafta (${formatDate(nextWeek, "dd.MM")})`, draft: weekDraft(nextWeek) },
            ]}
          />
        )}
      </div>
      <MasteryMap data={data} mode="readonly" />
    </div>
  )
}
