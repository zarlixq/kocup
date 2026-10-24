// Faz D — Maarif (9-10-11) öğrencilerinin TYT/AYT tabanlı yol haritalarını arşivleyip
// yeni algoritmayla yeniden üretir. YALNIZ açıkça istenince yazar:
//   E2E=1 UPPLAN_FAZ_D=1 npx vitest run tests/upplan/live/faz-d.local.test.ts
// UPPLAN_FAZ_D yoksa kuru çalışma: yalnız kimlerin etkileneceğini yazar.
// 12. sınıf ve mezunların yol haritalarına/programlarına DOKUNMAZ.
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { parsePayload } from "@/lib/upplan/roadmap-service"
import { supersedeRoadmap, type SupersedeResult } from "@/lib/upplan/supersede"

loadEnv()
const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.env.UPPLAN_FAZ_D === "1"

describe("Faz D: Maarif yol haritalarını yenile", () => {
  it("TYT/AYT tabanlı Maarif yol haritaları superseded + yeniden üretim", { timeout: 300000 }, async () => {
    const { data: profiles } = await admin.from("student_upplan_profile").select("student_id, track").in("track", ["maarif_9", "maarif_10", "maarif_11"])
    const ids = (profiles ?? []).map((p) => p.student_id)
    const { data: rows } = await admin.from("upplan_roadmaps").select("student_id, status, payload").in("student_id", ids)
    const { data: subjects } = await admin.from("subjects").select("id, exam_type")
    const yksSubjects = new Set((subjects ?? []).filter((s) => s.exam_type === "tyt" || s.exam_type === "ayt").map((s) => s.id))
    // TYT/AYT konusu içeren (eski algoritmanın) yol haritaları.
    const targets = (rows ?? []).filter((r) => (parsePayload(r.payload)?.items ?? []).some((i) => yksSubjects.has(i.subject_id)))
    const results: (SupersedeResult & { track?: string; previous: string })[] = []
    for (const r of targets) {
      const track = profiles?.find((p) => p.student_id === r.student_id)?.track ?? undefined
      if (!WRITE) {
        results.push({ studentId: r.student_id, track, previous: r.status, archived: false, cancelledGoals: 0, keptProgressedGoals: 0, newStatus: null })
        continue
      }
      const res = await supersedeRoadmap(admin, r.student_id, "tymm-2026 track geçişi: TYT/AYT tabanlı Maarif yol haritası")
      results.push({ ...res, track, previous: r.status })
    }
    writeFileSync(process.env.UPPLAN_FAZ_D_OUT ?? "upplan-faz-d.json", JSON.stringify({ write: WRITE, results }, null, 2))
    // Fail-loud (müsaitlik / sınıf eksik) öğrencide eski harita superseded olur, yenisi üretilmez.
    expect(results.every((r) => r.archived && (!r.error || r.newStatus === "superseded"))).toBe(true)
  })
})
