// Eşleştirme uyum testi. 1. test canlı DB'den SALT OKUMA; 2. test TEST hesabına yazar
// (temizlik: node scripts/cleanup-playlist-e2e.mjs). Bıyıklı 55 Gün playlist'inde
// öğrencinin düzelttiği eşleşme (doğru cevap) ile otomatik eşleştirme karşılaştırılır:
// eski algoritma, yeni algoritma (düzeltme tablosu olmadan) ve düzeltme tablosuyla.
// Doğru cevap: playlist'i ekleyip en çok düzeltme yapmış öğrencinin video→konu kayıtları.
// Çalıştırma: E2E=1 npx vitest run lib/resources/__e2e__/video-match-agreement.e2e.local.test.ts
import { describe, expect, it } from "vitest"
import { writeFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { loadEnv } from "../../../scripts/lib/env.mjs"
import { matchVideoTopic } from "@/lib/resources/video-match"
import { cleanTitle, matchPlaylistVideos, noiseSegments, type MatchTopic } from "@/lib/resources/video-topic-match"
import { getPlaylist } from "@/lib/resources/youtube"
import { insertVideos, recordTopicCorrections } from "@/lib/resources/video-sync"

loadEnv()
const admin: SupabaseClient<Database> = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const BIYIKLI_55 = "PL2wqvRc1FjTlt-yzGniaw8APzbPI4fTxm"
const E2E_EMAIL = "test-playlist@kocupakademi.com"
const E2E_PASS = "Test-Playlist-2026!x"
const report: Record<string, unknown> = {}
let truthMap = new Map<string, string | null>()

describe("eşleştirme uyumu: Bıyıklı 55 Gün", () => {
  it("eski / yeni / düzeltmeli otomatik eşleştirme ↔ öğrencinin düzeltilmiş eşleşmesi", { timeout: 60000 }, async () => {
    const { data: corr } = await admin.from("youtube_video_topic_corrections").select("student_id, youtube_video_id, topic_id, updated_at").eq("youtube_playlist_id", BIYIKLI_55)
    const byStudent = new Map<string, number>()
    for (const c of corr ?? []) byStudent.set(c.student_id, (byStudent.get(c.student_id) ?? 0) + 1)
    const truthStudent = Array.from(byStudent).sort((a, b) => b[1] - a[1])[0]?.[0]
    expect(truthStudent, "düzeltme kaydı yok").toBeTruthy()

    const { data: pl } = await admin
      .from("student_resource_playlists")
      .select("id, subject_id, subjects(name)")
      .eq("student_id", truthStudent!)
      .eq("youtube_playlist_id", BIYIKLI_55)
      .single()
    const { data: videos } = await admin
      .from("student_resource_videos")
      .select("youtube_video_id, title, position, topic_id, match_status")
      .eq("playlist_id", pl!.id)
      .order("position")
    const truth = new Map((videos ?? []).map((v) => [v.youtube_video_id, v.match_status === "eslesmedi" ? null : v.topic_id]))
    truthMap = truth

    const { data: subjects } = await admin.from("subjects").select("id, name").in("name", ["TYT Matematik", "TYT Geometri"])
    const { data: topicRows } = await admin.from("topics").select("id, name, subject_id").eq("is_active", true).in("subject_id", (subjects ?? []).map((s) => s.id))
    const topics: MatchTopic[] = (topicRows ?? []).map((t) => ({ id: t.id, name: t.name, own: t.subject_id === pl!.subject_id }))
    const names = new Map(topics.map((t) => [t.id, t.name]))
    const input = (videos ?? []).map((v) => ({ videoId: v.youtube_video_id, title: v.title }))

    // Eski: kendi dersinde başlık ↔ konu (eşik üstü her eşleşme bağlanırdı).
    const own = topics.filter((t) => t.own)
    const oldRes = new Map(input.map((v) => [v.videoId, matchVideoTopic(v.title, own)?.topic_id ?? null]))
    const fresh = matchPlaylistVideos(input, topics)
    const withCorr = matchPlaylistVideos(input, topics, corr ?? [])
    // Eş anlamlı tablosu olmadan (yalnız temizleme + kelime + sıra sayısı + gün kuralı).
    const noAlias = matchPlaylistVideos(input, topics, [], { aliases: {} })
    const noAliasBound = new Map(input.map((v) => [v.videoId, noAlias.get(v.videoId)?.confident ? noAlias.get(v.videoId)!.topic_id : null]))

    const score = (res: Map<string, string | null>) => {
      const misses = input.filter((v) => res.get(v.videoId) !== truth.get(v.videoId))
      return { agree: input.length - misses.length, total: input.length, rate: Math.round(((input.length - misses.length) / input.length) * 1000) / 10, misses }
    }
    // Yeni: yalnız güvenli eşleşme bağlanır; güvensiz öneri "onay bekliyor" (bağlı değil).
    const bound = new Map(input.map((v) => [v.videoId, fresh.get(v.videoId)?.confident ? fresh.get(v.videoId)!.topic_id : null]))
    const suggested = new Map(input.map((v) => [v.videoId, fresh.get(v.videoId)?.topic_id ?? null]))
    const oldS = score(oldRes)
    const boundS = score(bound)
    const suggS = score(suggested)
    const corrS = score(new Map(input.map((v) => [v.videoId, withCorr.get(v.videoId)?.topic_id ?? null])))
    const noise = noiseSegments(input.map((v) => v.title))
    const show = (s: ReturnType<typeof score>, res: Map<string, string | null>) =>
      s.misses.map((v) => {
        const m = fresh.get(v.videoId)
        return `${cleanTitle(v.title, noise) || v.title} → ${names.get(res.get(v.videoId) ?? "") ?? "—"} (doğru: ${names.get(truth.get(v.videoId) ?? "") ?? "konusuz"})${m && !m.confident ? " [onay bekliyor]" : ""}`
      })
    const pending = input.filter((v) => fresh.get(v.videoId) && !fresh.get(v.videoId)!.confident)
    const via = new Map<string, number>()
    for (const v of input) {
      const m = fresh.get(v.videoId)
      const k = m ? `${m.via}${m.confident ? "" : " (onay bekliyor)"}` : "eşleşmedi"
      via.set(k, (via.get(k) ?? 0) + 1)
    }
    Object.assign(report, {
      videos: input.length,
      eski: { ...oldS, misses: show(oldS, oldRes) },
      yeni_baglanan: { ...boundS, misses: show(boundS, bound) },
      yeni_oneri_dahil: { ...suggS, misses: show(suggS, suggested) },
      yeni_es_anlamlisiz: (() => {
        const s = score(noAliasBound)
        return {
          ...s,
          onay_bekliyor: input.filter((v) => noAlias.get(v.videoId) && !noAlias.get(v.videoId)!.confident).length,
          yanlis_baglanan: input.filter((v) => noAlias.get(v.videoId)?.confident && noAlias.get(v.videoId)!.topic_id !== truth.get(v.videoId)).length,
          misses: s.misses.map((v) => `${cleanTitle(v.title, noise)} → ${names.get(noAlias.get(v.videoId)?.topic_id ?? "") ?? "—"}${noAlias.get(v.videoId) && !noAlias.get(v.videoId)!.confident ? " [onay bekliyor]" : ""} (doğru: ${names.get(truth.get(v.videoId) ?? "") ?? "konusuz"})`),
        }
      })(),
      yeni_duzeltmeli: { ...corrS, misses: show(corrS, new Map(input.map((v) => [v.videoId, withCorr.get(v.videoId)?.topic_id ?? null]))) },
      onay_bekliyor: pending.map((v) => `${cleanTitle(v.title, noise)} → ${names.get(fresh.get(v.videoId)!.topic_id)}`),
      yontem: Object.fromEntries(via),
      // Yanlış bağlanan (güvenli sanılıp hatalı) — en kötü hata türü.
      yanlis_baglanan: input.filter((v) => fresh.get(v.videoId)?.confident && fresh.get(v.videoId)!.topic_id !== truth.get(v.videoId)).length,
    })
    writeFileSync("video-match-agreement-report.json", JSON.stringify(report, null, 2))
    expect(corrS.rate).toBeGreaterThanOrEqual(suggS.rate)
    expect(suggS.rate).toBeGreaterThan(oldS.rate)
  })

  it("yeni öğrenci aynı playlist'i ekler: düzeltmeler önce önerilir, elle düzeltme tabloya yazılır", { timeout: 120000 }, async () => {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    let id = list.users.find((u) => u.email === E2E_EMAIL)?.id
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({ email: E2E_EMAIL, password: E2E_PASS, email_confirm: true, user_metadata: { role: "student", full_name: "TEST Playlist" } })
      if (error) throw error
      id = data.user!.id
    }
    await admin.from("students").upsert({ id, grade: "12", coach_id: null, notes: "TEST playlist e2e" })
    const a = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    const { error: se } = await a.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASS })
    if (se) throw se
    const yt = await getPlaylist(BIYIKLI_55)
    if ("error" in yt) throw new Error(yt.error)
    const { data: subject } = await admin.from("subjects").select("id").eq("name", "TYT Matematik").single()
    const { data: pl, error: pe } = await a
      .from("student_resource_playlists")
      .insert({ student_id: id, subject_id: subject!.id, kind: "playlist", teacher_name: yt.channelTitle!, channel_title: yt.channelTitle, title: yt.title, youtube_playlist_id: BIYIKLI_55, source: "youtube" })
      .select("id")
      .single()
    if (pe) throw pe
    // Uygulamanın ekleme yolu (öğrencinin oturum client'ı; düzeltmeler service role ile okunur).
    const res = await insertVideos(a, id, pl.id, subject!.id, yt.videos)
    if ("error" in res) throw new Error(res.error)
    const { data: rows } = await a.from("student_resource_videos").select("id, youtube_video_id, topic_id, suggested_topic_id, match_status").eq("playlist_id", pl.id)
    const got = new Map((rows ?? []).map((r) => [r.youtube_video_id, r.match_status === "eslesmedi" ? null : r.topic_id]))
    const agree = Array.from(truthMap).filter(([vid, t]) => got.get(vid) === t).length
    report.yeni_ogrenci = { inserted: res.inserted, matched: res.matched, pending: res.pending, agree: `${agree}/${truthMap.size}`, rate: Math.round((agree / truthMap.size) * 1000) / 10 }
    expect(agree).toBe(truthMap.size)

    // Elle düzeltme global tabloya öğrenci başına yazılır (çoğunluk: aynı karar 2 öğrenci).
    const one = (rows ?? [])[5]
    await a.from("student_resource_videos").update({ topic_id: one.topic_id, match_status: "onaylandi" }).eq("id", one.id)
    await recordTopicCorrections(id, [one.id])
    const { data: c } = await admin.from("youtube_video_topic_corrections").select("student_id").eq("youtube_playlist_id", BIYIKLI_55).eq("youtube_video_id", one.youtube_video_id).eq("student_id", id)
    expect(c?.length).toBe(1)
    writeFileSync("video-match-agreement-report.json", JSON.stringify(report, null, 2))
  })
})
