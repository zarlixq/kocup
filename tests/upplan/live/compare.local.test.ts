// Canlı DB'de YAZMADAN önce/sonra karşılaştırması (E2E=1 ile çalışır):
//   E2E=1 npx vitest run tests/upplan/live/compare.local.test.ts
// - Kurucunun mezun/sayısal profili: kayıtlı (onaylı) 2026-10-26 haftası ↔ yeni algoritmanın
//   aynı hafta için önizlemesi (yol haritası + program, hiçbir şey kaydedilmez).
// - Maarif öğrencileri: yeni yol haritası özeti.
// Çıktı: UPPLAN_COMPARE_OUT (varsayılan upplan-compare.json).
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { gatherRoadmapContext, roadmapFromContext } from "@/lib/upplan/roadmap-service"
import { buildProgramDraft, parseDraftItems } from "@/lib/upplan/program-service"
import { summarizeWeek } from "@/tests/upplan/week-summary"

loadEnv()
const admin: SupabaseClient<Database> = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const FOUNDER = "7460cbe9-8295-4865-9e34-16dbd761b42a"
const WEEK = "2026-10-26"
const TODAY = "2026-10-24"

describe("UpPlan önce/sonra (canlı, yazmasız)", () => {
  it("kurucu haftası + Maarif özetleri", { timeout: 180000 }, async () => {
    const out: Record<string, unknown> = {}
    const { data: subjects } = await admin.from("subjects").select("id, name")
    const names = new Map((subjects ?? []).map((s) => [s.id, s.name]))

    const { data: before } = await admin.from("upplan_program_drafts").select("items, meta").eq("student_id", FOUNDER).eq("week_start", WEEK).maybeSingle()
    const beforeItems = parseDraftItems(before?.items)
    out.before = summarizeWeek(beforeItems, names)

    const ctx = await gatherRoadmapContext(admin, FOUNDER, TODAY)
    if ("error" in ctx) throw new Error(ctx.error)
    const roadmap = roadmapFromContext(ctx)
    const after = await buildProgramDraft(admin, FOUNDER, WEEK, TODAY, { previewRoadmap: roadmap })
    if ("error" in after) throw new Error(after.error)
    out.after = { ...summarizeWeek(after.items, names), meta: after.meta }
    out.afterItems = after.items.map((i) => `${i.day_of_week} ${i.start_time}-${i.end_time} [${i.block_type}] ${i.baslik}${i.hedef_soru ? ` (${i.hedef_soru} soru)` : ""} — ${i.neden ?? ""}`)
    out.roadmap = {
      track: ctx.track,
      examDate: roadmap.examDate,
      aytForceStart: roadmap.aytForceStart ?? null,
      top: roadmap.items.slice(0, 12).map((i) => `${i.plan_order}. ${i.subject_name} › ${i.topic_name} [${i.status}] öncelik ${i.priority?.toFixed(3)}`),
      overflow: roadmap.overflow,
    }

    const { data: maarif } = await admin.from("student_upplan_profile").select("student_id, track").in("track", ["maarif_9", "maarif_10", "maarif_11"])
    const rows: unknown[] = []
    for (const m of maarif ?? []) {
      const c = await gatherRoadmapContext(admin, m.student_id, TODAY)
      if ("error" in c) {
        rows.push({ student: m.student_id, track: m.track, error: c.error })
        continue
      }
      const r = roadmapFromContext(c)
      const subjectsIn = new Set(r.items.map((i) => i.subject_name))
      rows.push({
        student: m.student_id.slice(0, 8),
        track: c.track,
        examDate: r.examDate,
        items: r.items.length,
        aktif: r.items.filter((i) => i.status === "aktif").length,
        yksTopics: r.items.filter((i) => /^(TYT|AYT) /.test(i.subject_name)).length,
        subjects: Array.from(subjectsIn),
        overflow: r.overflow?.message ?? null,
        first: r.items.slice(0, 5).map((i) => `${i.subject_name} › ${i.topic_name}: ${i.reasons[0]}`),
      })
    }
    out.maarif = rows
    writeFileSync(process.env.UPPLAN_COMPARE_OUT ?? "upplan-compare.json", JSON.stringify(out, null, 2))
    expect(after.items.length).toBeGreaterThan(0)
  })
})
