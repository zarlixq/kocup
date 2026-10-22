import { describe, expect, it } from "vitest"
import { prioritizeVideos, type PriorityContext } from "@/lib/resources/video-priority"
import { summarizeBySubject, videoActivity, watchedOnDay } from "@/lib/resources/video-summary"
import type { PlaylistRow, VideoRow } from "@/lib/resources/videos"

const NOW = new Date("2026-10-21T12:00:00+03:00")

function video(id: string, position: number, extra: Partial<VideoRow> = {}): VideoRow {
  return {
    id,
    playlist_id: "p",
    youtube_video_id: id.padEnd(11, "x"),
    title: `Video ${id}`,
    position,
    topic_id: null,
    topic_name: null,
    match_status: "eslesmedi",
    watch_status: "izlenmedi",
    understanding: null,
    watched_at: null,
    duration_seconds: 600,
    thumbnail_url: null,
    note: null,
    plan_day: null,
    planned_date: null,
    suggested_topic_id: null,
    suggested_topic_name: null,
    ...extra,
  }
}

function playlist(id: string, subject: string, videos: VideoRow[], extra: Partial<PlaylistRow> = {}): PlaylistRow {
  return {
    id,
    kind: "playlist",
    subject_id: subject,
    subject_name: subject === "fiz" ? "Fizik" : "Matematik",
    subject_color: null,
    teacher_name: "Hoca",
    title: `Liste ${id}`,
    source: "youtube",
    status: "aktif",
    youtube_playlist_id: null,
    thumbnail_url: null,
    last_synced_at: null,
    channel_title: null,
    issue: null,
    plan: null,
    videos: videos.map((v) => ({ ...v, playlist_id: id })),
    ...extra,
  }
}

const emptyCtx: PriorityContext = { programTopics: new Map(), goalTopics: new Map(), queuedTopics: new Map(), weakTopics: new Map() }

describe("video önceliği", () => {
  it("programdaki konu en üstte, gerekçeli", () => {
    const lists = [
      playlist("a", "mat", [video("a1", 0), video("a2", 1, { topic_id: "turev", match_status: "onaylandi" })]),
      playlist("b", "fiz", [video("b1", 0, { watch_status: "izlendi", watched_at: "2026-10-12T10:00:00Z" }), video("b2", 1)]),
    ]
    const r = prioritizeVideos(lists, { ...emptyCtx, programTopics: new Map([["turev", "Türev"]]) }, NOW)
    expect(r[0].video.id).toBe("a2")
    expect(r[0].reasons).toContain("Programında bu hafta Türev var")
    const fiz = r.find((s) => s.video.id === "b2")!
    expect(fiz.reasons.join(" ")).toContain("Fizik dersinde 9 gündür video izlemedin")
  })
  it("duraklatılan ve biten playlist önerilmez", () => {
    const lists = [
      playlist("a", "mat", [video("a1", 0)], { status: "duraklatildi" }),
      playlist("b", "mat", [video("b1", 0, { watch_status: "izlendi", watched_at: "2026-10-20T10:00:00Z" })]),
    ]
    expect(prioritizeVideos(lists, emptyCtx, NOW)).toEqual([])
  })
})

describe("video özetleri", () => {
  const lists = [
    playlist("a", "mat", [
      video("a1", 0, { watch_status: "izlendi", watched_at: "2026-10-20T22:30:00Z" }),
      video("a2", 1),
      video("a3", 2, { duration_seconds: null }),
    ]),
  ]
  it("ders tablosu ve bugün (Istanbul günü)", () => {
    expect(summarizeBySubject(lists)[0]).toMatchObject({ watched: 1, total: 3, remaining: 2, remainingSeconds: 600, remainingUnknown: 1 })
    // 20.10 22:30 UTC = 21.10 01:30 Istanbul → bugün.
    expect(watchedOnDay(lists, "2026-10-21")).toEqual({ count: 1, seconds: 600 })
  })
  it("haftalık aktivite", () => {
    const a = videoActivity(lists, 7, NOW)
    expect(a.data).toHaveLength(7)
    expect(a.data[6]).toMatchObject({ date: "2026-10-21", label: "21.10", c_mat: 1, m_mat: 10 })
    expect(a.series.map((s) => s.name)).toEqual(["Matematik"])
  })
})
