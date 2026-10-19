import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { istanbulDateStr } from "@/lib/tz"
import { GOAL_TEMPLATES, NO_DATA_MASTERY, type BlockType } from "@/lib/upplan/config"
import { loadMasteryInfo, isBlockType, parsePayload, type RoadmapPayload } from "@/lib/upplan/roadmap-service"
import { paceStatus, type Edge } from "@/lib/upplan/roadmap"
import { buildTimeline, type TimelineMonth } from "@/lib/upplan/roadmap-view-shared"

export type { TimelineMonth }

type Client = SupabaseClient<Database>

// Konularım → Yol haritası görünümü (öğrenci ve koç ortak; okuma RLS ile).

export type RoadmapRow = {
  id: string
  topic_id: string
  topic_name: string
  subject_name: string
  status: "aktif" | "sirada" | "zaman_kalirsa" | "tamamlandi" | "iptal"
  source: "upplan" | "student" | "coach"
  block_type: BlockType
  hedef_soru: number | null
  cozulen: number
  effective: number
  start: string
  end: string
  plan_order: number | null
  pace: "zamaninda" | "geride" | null
  reasons: string[]
}

export type RoadmapView = {
  status: "yok" | "taslak" | "onaylandi" | "koca_onerildi"
  generatedAt: string | null
  payload: RoadmapPayload | null
  rows: RoadmapRow[]
  edges: Edge[]
  timeline: TimelineMonth[]
  /** Yol haritası üretildikten sonra deneme girildi → "güncelleyelim mi?" */
  newExamSince: boolean
}

export async function loadRoadmapView(db: Client, studentId: string, today = istanbulDateStr()): Promise<RoadmapView> {
  const [{ data: rm }, goals, mastery, { data: queued }, { data: lastExam }] = await Promise.all([
    db.from("upplan_roadmaps").select("status, payload, generated_at").eq("student_id", studentId).maybeSingle(),
    loadAssignmentsWithProgress(db, { studentId }),
    loadMasteryInfo(db, studentId),
    db
      .from("topic_assignments")
      .select("id, topic_id, status, block_type, hedef_soru, baslangic_tarihi, son_tarih, plan_order, topics(name, subjects(name))")
      .eq("student_id", studentId)
      .eq("origin", "upplan")
      .in("status", ["sirada", "zaman_kalirsa", "iptal"]),
    db.from("exams").select("created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  const payload = parsePayload(rm?.payload)
  const reasonsByTopic = new Map((payload?.items ?? []).map((i) => [i.topic_id, i.reasons]))
  const eff = (topicId: string) => mastery.get(topicId)?.effective ?? NO_DATA_MASTERY

  // Plan sırası: onaylı satırların plan_order'ı; yoksa taslaktaki sıra.
  const { data: orderRows } = await db
    .from("topic_assignments")
    .select("id, plan_order, block_type, origin")
    .eq("student_id", studentId)
    .in("status", ["aktif", "tamamlandi"])
  const meta = new Map((orderRows ?? []).map((r) => [r.id, r]))

  const rows: RoadmapRow[] = []
  for (const g of goals) {
    if (g.status === "iptal") continue
    const m = meta.get(g.id)
    const bt = isBlockType(m?.block_type) ? m.block_type : "soru_cozum"
    rows.push({
      id: g.id,
      topic_id: g.topic_id,
      topic_name: g.topic_name,
      subject_name: g.subject_name,
      status: g.status === "aktif" ? "aktif" : "tamamlandi",
      source: m?.origin === "upplan" && g.created_by_role === "ai" ? "upplan" : g.created_by_role === "coach" ? "coach" : "student",
      block_type: bt,
      hedef_soru: g.hedef_soru,
      cozulen: g.cozulen_soru,
      effective: eff(g.topic_id),
      start: g.baslangic_tarihi,
      end: g.son_tarih,
      plan_order: m?.plan_order ?? null,
      pace: g.status === "aktif" ? paceStatus({ start: g.baslangic_tarihi, end: g.son_tarih, today, solved: g.cozulen_soru, target: g.hedef_soru }) : null,
      reasons: reasonsByTopic.get(g.topic_id) ?? (g.notes ? [g.notes] : []),
    })
  }
  for (const q of queued ?? []) {
    const bt = isBlockType(q.block_type) ? q.block_type : "soru_cozum"
    rows.push({
      id: q.id,
      topic_id: q.topic_id,
      topic_name: q.topics?.name ?? "—",
      subject_name: q.topics?.subjects?.name ?? "—",
      status: q.status === "sirada" ? "sirada" : q.status === "zaman_kalirsa" ? "zaman_kalirsa" : "iptal",
      source: "upplan",
      block_type: bt,
      hedef_soru: q.hedef_soru ?? GOAL_TEMPLATES[bt].questions,
      cozulen: 0,
      effective: eff(q.topic_id),
      start: q.baslangic_tarihi,
      end: q.son_tarih,
      plan_order: q.plan_order,
      pace: null,
      reasons: reasonsByTopic.get(q.topic_id) ?? [],
    })
  }
  rows.sort((a, b) => (a.plan_order ?? 1e9) - (b.plan_order ?? 1e9) || a.end.localeCompare(b.end))

  const status = (rm?.status as RoadmapView["status"] | undefined) ?? "yok"
  const topicIds = new Set(rows.map((r) => r.topic_id))
  return {
    status,
    generatedAt: rm?.generated_at ?? null,
    payload,
    rows,
    edges: (payload?.edges ?? []).filter((e) => topicIds.has(e.prereq) && topicIds.has(e.topic)),
    timeline: payload
      ? buildTimeline(
          rows.filter((r) => r.status === "aktif" || r.status === "sirada"),
          today,
          payload.examPeriodStart,
        )
      : [],
    newExamSince: !!(rm?.generated_at && lastExam?.created_at && lastExam.created_at > rm.generated_at),
  }
}
