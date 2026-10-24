import { describe, expect, it } from "vitest"
import { ALL_WEEKDAYS, planDates, planUnits, reflowPlan } from "@/lib/resources/playlist-plan"
import {
  buildPlaylistScope,
  buildPlaylistSubjects,
  playlistGoalDates,
  playlistShortLabel,
  playlistTopicLabel,
  type ScopePlaylist,
  type ScopeVideo,
} from "@/lib/upplan/playlist-order"
import { addDaysIso, buildRoadmap, type RoadmapTopicInput } from "@/lib/upplan/roadmap"
import { scheduleWeek, weekRulesFor, type ProgramGoal, type ScheduleInput } from "@/lib/upplan/scheduler"

// "55 Günde" benzeri playlist: günde 2 video, dün başladı. Konular 3'er günlük
// bloklar (k1: 1-3. gün, k2: 4-6. gün, …); 40. gün Üçgenler.
const TODAY = "2026-10-19" // Pazartesi
const START = "2026-10-18" // dün
const EXAM = "2027-06-19"
const topicOfDay = (d: number) => (d === 40 ? "ucgen" : `k${Math.ceil(d / 3)}`)

function campVideos(start = START, days = 55): ScopeVideo[] {
  const dates = planDates(days, start, ALL_WEEKDAYS)
  const out: ScopeVideo[] = []
  for (let d = 1; d <= days; d++) {
    for (let j = 0; j < 2; j++) {
      out.push({ topic_id: topicOfDay(d), match_status: "oneri", plan_day: d, planned_date: dates[d - 1], watch_status: "izlenmedi", position: out.length })
    }
  }
  return out
}

function playlist(id: string, videos: ScopeVideo[], over: Partial<ScopePlaylist> = {}): ScopePlaylist {
  return { id, name: "Bıyıklı Matematik", subject_id: "tytmat", kind: "playlist", status: "aktif", planned: true, order_topics: true, videos, ...over }
}

function topic(id: string, over: Partial<RoadmapTopicInput> = {}): RoadmapTopicInput {
  return {
    topic_id: id,
    topic_name: id.toUpperCase(),
    subject_id: "tytmat",
    subject_name: "TYT Matematik",
    weight: 2,
    weightEstimated: true,
    effective: 20,
    assessment: "hic_gormedim",
    examWrongs: 0,
    netGap: 1,
    gapAtom: null,
    ...over,
  }
}

const campTopics = Array.from(new Set(Array.from({ length: 55 }, (_, i) => topicOfDay(i + 1))))

describe("playlist kapsamı", () => {
  it("konu = eşlenen videolar; sıra ilk videonun plan günü; eşleşmeyen video kapsam dışı", () => {
    const videos = campVideos()
    videos[0] = { ...videos[0], topic_id: "yanlis", match_status: "eslesmedi" }
    const scope = buildPlaylistScope([playlist("p1", videos)])
    expect(scope.yanlis).toBeUndefined()
    expect(scope.k1).toMatchObject({ day: 1, start: START, last: "2026-10-20", notBefore: START })
    expect(scope.ucgen).toMatchObject({ day: 40, start: addDaysIso(START, 39) })
    expect(playlistTopicLabel(scope.k2)).toBe("Bıyıklı Matematik · 4. Gün")
    expect(playlistShortLabel(scope.k2)).toBe("Bıyıklı 4. Gün")
  })

  it("pasif, plansız ya da seçeneği kapalı playlist sırayı belirlemez", () => {
    expect(buildPlaylistScope([playlist("p", campVideos(), { status: "duraklatildi" })])).toEqual({})
    expect(buildPlaylistScope([playlist("p", campVideos(), { planned: false })])).toEqual({})
    expect(buildPlaylistScope([playlist("p", campVideos(), { order_topics: false })])).toEqual({})
  })

  it("iki playlist aynı konuyu kapsıyorsa daha erken plan günü olan geçerli", () => {
    const late = playlist("mat", campVideos("2026-10-25"))
    const early = playlist("geo", [{ topic_id: "k2", match_status: "onaylandi", plan_day: 2, planned_date: "2026-10-20", watch_status: "izlenmedi", position: 0 }], {
      name: "Rehber Matematik",
    })
    const scope = buildPlaylistScope([late, early])
    expect(scope.k2).toMatchObject({ playlist_id: "geo", start: "2026-10-20" })
    expect(scope.k1.playlist_id).toBe("mat")
    // Başlamış (izlenmiş videosu olan) konu tarihten bağımsız önde.
    const started = playlist("x", [{ topic_id: "k2", match_status: "oneri", plan_day: null, planned_date: null, watch_status: "izlendi", position: 0 }], { name: "X" })
    expect(buildPlaylistScope([early, started]).k2.playlist_id).toBe("x")
  })

  it("hedef tarihi = son videonun plan tarihi + 3 gün tampon", () => {
    const scope = buildPlaylistScope([playlist("p1", campVideos())])
    expect(playlistGoalDates(scope.k2, TODAY, EXAM)).toEqual({ start: "2026-10-21", end: "2026-10-26", reached: false })
    expect(playlistGoalDates(scope.k1, TODAY, EXAM).reached).toBe(true)
  })
})

describe("kapsamdaki dersler", () => {
  it("playlist'in dersi + en az 2 konusu eşlenen ders; bitiş = izlenmemiş son plan günü", () => {
    const videos = campVideos().map((v) => ({ ...v, subject_id: "tytmat" }))
    const geo1 = { topic_id: "acilar", match_status: "oneri", plan_day: 20, planned_date: "2026-11-06", watch_status: "izlenmedi", position: 500, subject_id: "geo" }
    const one = buildPlaylistSubjects([playlist("p1", [...videos, geo1])])
    expect(Object.keys(one).sort()).toEqual(["tytmat"])
    expect(one.tytmat.until).toBe(addDaysIso(START, 54))
    const two = buildPlaylistSubjects([playlist("p1", [...videos, geo1, { ...geo1, topic_id: "ucgenler", position: 501 }])])
    expect(Object.keys(two).sort()).toEqual(["geo", "tytmat"])
  })
})

describe("yol haritası: playlist sırası", () => {
  const scope = buildPlaylistScope([playlist("p1", campVideos())])
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 900, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [], edges: [] }
  const topics = [...campTopics.map((id) => topic(id)), topic("mantik", { weight: 4 }), topic("paragraf", { subject_id: "tur", subject_name: "TYT Türkçe" })]

  it("kapsamdaki konular playlist gün sırasıyla; günü gelen aktif, gelecektekiler sırada", () => {
    // Üçgenler en verimli konu olsa da 40. gününden önce başlamaz.
    const r = buildRoadmap({ ...base, topics: topics.map((t) => (t.topic_id === "ucgen" ? { ...t, weight: 9 } : t)), playlistTopics: scope })
    const by = new Map(r.items.map((i) => [i.topic_id, i]))
    expect(by.get("k1")).toMatchObject({ status: "aktif", start: START })
    expect(by.get("k2")).toMatchObject({ status: "sirada", start: "2026-10-21", end: "2026-10-26" })
    const ucgen = by.get("ucgen")!
    expect(ucgen).toMatchObject({ status: "sirada", start: addDaysIso(START, 39), end: addDaysIso(START, 42) })
    expect(ucgen.wave).toBeGreaterThan(1)
    expect(ucgen.playlist?.label).toBe("Bıyıklı Matematik · 40. Gün")
    expect(ucgen.reasons[0]).toBe("Konu sırası playlist'ten: Bıyıklı Matematik · 40. Gün")
    // Plan sırası playlist günüyle aynı.
    const scopedOrder = r.items.filter((i) => i.playlist).sort((a, b) => a.plan_order - b.plan_order).map((i) => i.topic_id)
    expect(scopedOrder).toEqual([...campTopics].sort((a, b) => scope[a].start!.localeCompare(scope[b].start!)))
    // Kapsam dışı konular UpPlan algoritmasıyla.
    expect(by.get("mantik")?.playlist).toBeUndefined()
    expect(by.get("paragraf")?.status).toBe("aktif")
  })

  it("kapsamdaki konu kapasite yetmese de 'zaman kalırsa' olmaz; süresi kapasiteye sayılır", () => {
    const tight = buildRoadmap({ ...base, weeklyMinutes: 120, topics, playlistTopics: scope })
    expect(tight.items.filter((i) => i.playlist && i.status === "zaman_kalirsa")).toEqual([])
    // Playlist yükü kapasiteden düşülür: kapsam dışı konu playlist yokkenkinden erken başlamaz.
    const without = buildRoadmap({ ...base, weeklyMinutes: 500, topics: [topic("mantik", { weight: 4 })] })
    const withPl = buildRoadmap({ ...base, weeklyMinutes: 500, topics, playlistTopics: scope })
    expect(without.items.find((i) => i.topic_id === "mantik")!.status).not.toBe("zaman_kalirsa")
    expect(withPl.items.find((i) => i.topic_id === "mantik")!.start >= without.items.find((i) => i.topic_id === "mantik")!.start).toBe(true)
  })

  it("UpPlan'ın önceki aktif hedefi playlist'e göre sıraya döner; koçun hedefi korunur", () => {
    const r = buildRoadmap({
      ...base,
      topics,
      playlistTopics: scope,
      existing: [
        { assignment_id: "a1", topic_id: "ucgen", source: "ai", remainingMinutes: 100, son_tarih: "2026-11-01" },
        { assignment_id: "a2", topic_id: "k5", source: "coach", remainingMinutes: 100, son_tarih: "2026-11-01" },
        { assignment_id: "a3", topic_id: "k9", source: "ai", remainingMinutes: 100, son_tarih: "2026-11-01", progressed: true },
      ],
    })
    const by = new Map(r.items.map((i) => [i.topic_id, i]))
    expect(by.get("ucgen")).toMatchObject({ status: "sirada", existing: null })
    expect(by.get("k5")).toMatchObject({ status: "aktif", existing: { assignment_id: "a2", source: "coach" } })
    expect(by.get("k5")!.playlist).toBeUndefined()
    expect(by.get("k9")).toMatchObject({ status: "aktif" })
  })

  it("kapsamdaki dersin playlist'te olmayan konusu playlist bitince başlar; diğer dersler etkilenmez", () => {
    const subjects = buildPlaylistSubjects([playlist("p1", campVideos())])
    const r = buildRoadmap({ ...base, topics, playlistTopics: scope, playlistSubjects: subjects })
    const mantik = r.items.find((i) => i.topic_id === "mantik")!
    expect(mantik.status).toBe("sirada")
    expect(mantik.start >= addDaysIso(START, 55)).toBe(true)
    expect(mantik.reasons[1]).toBe("Bıyıklı Matematik playlist'i bitince başlar (bu konu playlist'te yok)")
    expect(r.items.find((i) => i.topic_id === "paragraf")!.status).toBe("aktif")
  })

  it("sürekli pratik konusu (Problemler) da playlist günü gelene dek sırada", () => {
    const hareket = topic("ucgen", { topic_name: "Hareket Problemleri" })
    const r = buildRoadmap({ ...base, topics: [hareket, topic("k1")], playlistTopics: scope })
    expect(r.items.find((i) => i.topic_id === "ucgen")).toMatchObject({ practice: true, status: "sirada", start: addDaysIso(START, 39) })
    expect(r.items.find((i) => i.topic_id === "k1")).toMatchObject({ status: "aktif" })
    // Sırada başlangıç tarihine göre (öne yığılmaz).
    expect(r.items.find((i) => i.topic_id === "ucgen")!.plan_order).toBeGreaterThan(r.items.find((i) => i.topic_id === "k1")!.plan_order)
  })

  it("kaydırma sonrası konu tarihleri de kayar", () => {
    // 2 gün izlenmedi: bugün (20.10) kaydır → bekleyen günler bugünden başlar.
    const videos = campVideos()
    const shiftDay = "2026-10-20"
    const changes = reflowPlan(planUnits(videos.map((v) => ({ ...v, duration_seconds: null }))), shiftDay, ALL_WEEKDAYS)
    const shifted = videos.map((v) => ({ ...v, planned_date: changes.get(v.plan_day!) ?? v.planned_date }))
    const before = buildRoadmap({ ...base, today: shiftDay, topics, playlistTopics: buildPlaylistScope([playlist("p1", videos)]) })
    const after = buildRoadmap({ ...base, today: shiftDay, topics, playlistTopics: buildPlaylistScope([playlist("p1", shifted)]) })
    const get = (r: typeof before, id: string) => r.items.find((i) => i.topic_id === id)!
    expect(get(after, "ucgen").start).toBe(addDaysIso(get(before, "ucgen").start, 2))
    expect(get(after, "ucgen").end).toBe(addDaysIso(get(before, "ucgen").end, 2))
    expect(get(after, "k2").start).toBe(addDaysIso(get(before, "k2").start, 2))
  })
})

describe("haftalık program: playlist sırası", () => {
  const scope = buildPlaylistScope([playlist("p1", campVideos())])
  const goal = (topicId: string, over: Partial<ProgramGoal> = {}): ProgramGoal => ({
    assignment_id: `a-${topicId}`,
    topic_id: topicId,
    topic_name: topicId.toUpperCase(),
    subject_id: "tytmat",
    subject_name: "TYT Matematik",
    block_type: "soru_cozum",
    remaining_questions: 60,
    lecture_pending: true,
    son_tarih: playlistGoalDates(scope[topicId], TODAY, EXAM).end,
    scheduled_blocks: 0,
    ...over,
  })
  const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
  const evening = range(22, 32)
  const input: ScheduleInput = {
    weekStart: TODAY,
    today: TODAY,
    availability: { "1": evening, "2": evening, "3": evening, "4": evening, "5": evening, "6": range(8, 24), "7": range(8, 24) },
    focusMinutes: 45,
    loadFactor: 1,
    segment: "yks",
    weeksLeft: 30,
    minutesPerQuestion: 1.5,
    goals: campTopics.map((t) => goal(t)),
    reviews: [],
    fixed: [],
    rules: weekRulesFor({ track: null, schoolDays: [], holiday: false, skeleton: [] }),
    playlistTopics: Object.fromEntries(campTopics.map((t) => [t, { notBefore: scope[t].notBefore, label: playlistShortLabel(scope[t]) }])),
  }

  it("ilk haftanın programında yalnız playlist'in bu haftaya düşen konuları; 40. gün yok", () => {
    const r = scheduleWeek(input)
    const topicsIn = new Set(r.items.filter((i) => i.topic_id).map((i) => i.topic_id))
    // 18.10 başlangıç → hafta (19–25.10) 2–8. günler: k1 (1-3), k2 (4-6), k3 (7-9).
    expect(Array.from(topicsIn).sort()).toEqual(["k1", "k2", "k3"])
    expect(topicsIn.has("ucgen")).toBe(false)
  })

  it("soru bloğu konunun plan gününden önce yok; konu çalışması bloğu yok; başlıkta bağlam", () => {
    const r = scheduleWeek(input)
    expect(r.items.some((i) => i.baslik.startsWith("Konu çalışması"))).toBe(false)
    const k2 = r.items.filter((i) => i.topic_id === "k2")
    expect(k2.length).toBeGreaterThan(0)
    // k2'nin ilk videosu 21.10 (Çarşamba = 3).
    expect(Math.min(...k2.map((i) => i.day_of_week))).toBeGreaterThanOrEqual(3)
    expect(k2[0].baslik).toBe("Soru çözümü: K2 (Bıyıklı 4. Gün)")
    const k3 = r.items.filter((i) => i.topic_id === "k3")
    expect(Math.min(...k3.map((i) => i.day_of_week))).toBeGreaterThanOrEqual(6) // 24.10 Cumartesi
  })

  it("plan günü video bloğuyla aynıysa soru bloğu videodan sonra", () => {
    const r = scheduleWeek({
      ...input,
      goals: [goal("k2")],
      videoDays: [{ day_of_week: 3, minutes: 60, subject_id: "tytmat", label: "55 Gün (2 video)", topic_ids: ["k2"] }],
    })
    const video = r.items.find((i) => i.baslik.startsWith("Video:"))!
    const sameDay = r.items.filter((i) => i.topic_id === "k2" && i.day_of_week === 3 && !i.baslik.startsWith("Video:"))
    for (const b of sameDay) expect(b.start_time >= video.end_time).toBe(true)
  })

  it("ilk videosu izlenmiş konu için gün kısıtı yok", () => {
    const r = scheduleWeek({ ...input, goals: [goal("k2")], playlistTopics: { k2: { notBefore: null, label: "Bıyıklı 4. Gün" } } })
    expect(Math.min(...r.items.filter((i) => i.topic_id === "k2").map((i) => i.day_of_week))).toBe(1)
  })
})
