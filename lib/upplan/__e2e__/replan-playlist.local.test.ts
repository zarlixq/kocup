// Tek seferlik bakım: aktif playlist planı (konu sırası açık) olan öğrencilerin
// yol haritası ve bu haftanın programı yeni kurala göre TASLAK olarak yeniden
// hesaplanır. Onaylanmış program kalemleri ve hedefler (tamamlananlar dahil)
// değişmez; öğrenci (koçlu öğrencide koç) taslağı onaylayınca uygulanır.
// Sıra: önce program taslağı (onaylı yol haritası gerekir), sonra yol haritası taslağı.
// Çalıştırma: E2E=1 REPLAN=1 npx vitest run lib/upplan/__e2e__/replan-playlist.local.test.ts
// Kuru:       E2E=1 REPLAN=dry npx vitest run lib/upplan/__e2e__/replan-playlist.local.test.ts
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { generateRoadmapDraft } from "@/lib/upplan/roadmap-service"
import { generateProgramDraft } from "@/lib/upplan/program-service"

loadEnv()
const admin: SupabaseClient<Database> = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const MODE = process.env.REPLAN
const TEST_EMAIL = "test-playlist@kocupakademi.com"

describe.runIf(MODE)("playlist sırası: yeniden hesaplama", () => {
  it("planlı playlist'i olan öğrenciler", { timeout: 300000 }, async () => {
    const { data: lists, error } = await admin
      .from("student_resource_playlists")
      .select("student_id")
      .eq("kind", "playlist")
      .eq("status", "aktif")
      .eq("order_topics", true)
      .not("plan_mode", "is", null)
    if (error) throw error
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const testId = users.users.find((u) => u.email === TEST_EMAIL)?.id
    const students = Array.from(new Set((lists ?? []).map((l) => l.student_id))).filter((id) => id !== testId)
    const today = istanbulDateStr()
    const week = istanbulWeekStartStr()
    const out: Record<string, unknown>[] = []
    for (const id of students) {
      const { data: rm } = await admin.from("upplan_roadmaps").select("status").eq("student_id", id).maybeSingle()
      const row: Record<string, unknown> = { student: id, roadmapBefore: rm?.status ?? "yok" }
      if (MODE === "dry" || !rm) {
        out.push(row)
        continue
      }
      // Program taslağı onaylı yol haritasından üretilir; önce o.
      if (rm.status === "onaylandi") {
        const prog = await generateProgramDraft(admin, id, week, today)
        row.program = "error" in prog ? prog.error : { items: prog.items.length, meta: prog.meta }
      }
      const draft = await generateRoadmapDraft(admin, id)
      row.roadmap =
        "error" in draft
          ? draft.error
          : {
              status: draft.coached ? "koca_onerildi" : "taslak",
              playlistTopics: draft.payload.items.filter((i) => i.playlist).length,
              active: draft.payload.items.filter((i) => i.status === "aktif").length,
            }
      out.push(row)
    }
    writeFileSync("replan-playlist-report.json", JSON.stringify(out, null, 2))
    expect(Array.isArray(out)).toBe(true)
  })
})
