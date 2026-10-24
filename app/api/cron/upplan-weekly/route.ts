import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { runWeeklyUpdate, type WeeklyReport } from "@/lib/upplan/weekly"

// UpPlan haftalık güncelleme — Vercel Cron (vercel.json: Pazar 17:00 UTC = 20:00 İstanbul).
// Server Action dışarıdan tetiklenemediği için istisnai route handler.
// Vercel, CRON_SECRET tanımlıysa isteğe "Authorization: Bearer <CRON_SECRET>" ekler.
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const admin = supabaseAdmin()
  // ?student=<id> (tekrarlanabilir): yalnız bu öğrencileri işle — lokal uçtan uca
  // test gerçek öğrencilere dokunmasın diye. Vercel Cron parametresiz çağırır.
  const only = req.nextUrl.searchParams.getAll("student")
  // Eğitim yılı döndüyse track önbelleğini yenile (sınıf atlama, 12 → mezun). Tam çalıştırmada.
  if (!only.length) {
    const { error: re } = await admin.rpc("upplan_refresh_tracks")
    if (re) console.error("upplan-weekly track yenileme", re)
  }
  let q =admin.from("student_upplan_profile").select("student_id").not("completed_at", "is", null)
  if (only.length) q = q.in("student_id", only)
  const { data: profiles, error } = await q
  if (error) {
    console.error("upplan-weekly profiller", error)
    return NextResponse.json({ error: "Profiller okunamadı" }, { status: 500 })
  }

  const reports: WeeklyReport[] = []
  for (const p of profiles ?? []) {
    try {
      reports.push(await runWeeklyUpdate(admin, p.student_id))
    } catch (e) {
      console.error("upplan-weekly", p.student_id, e)
      reports.push({ studentId: p.student_id, completed: 0, opened: 0, extended: 0, shifted: 0, overflowed: 0, loadFactor: null, draftItems: null, error: "beklenmeyen hata" })
    }
  }
  return NextResponse.json({ students: reports.length, failed: reports.filter((r) => r.error).length })
}
