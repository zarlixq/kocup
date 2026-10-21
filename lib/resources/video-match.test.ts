import { describe, expect, it } from "vitest"
import {
  formatClock,
  formatSpan,
  matchVideoTopic,
  parseIsoDuration,
  parseYoutubeLink,
  parseManualVideoList,
  parseYoutubePlaylistId,
  parseYoutubeVideoId,
  teacherStats,
  titleTopicScore,
  videosCompleteLearning,
} from "@/lib/resources/video-match"

const TOPICS = [
  { id: "ardisik", name: "Ardışık Sayılar" },
  { id: "rasyonel", name: "Rasyonel Sayılar" },
  { id: "uslu", name: "Üslü Sayılar" },
  { id: "bolme", name: "Bölme ve Bölünebilme" },
  { id: "ebob", name: "EBOB - EKOK" },
  { id: "fonk", name: "Fonksiyonlar" },
]

describe("YouTube linkleri", () => {
  it("playlist ve video kimliği", () => {
    expect(parseYoutubePlaylistId("https://www.youtube.com/playlist?list=PLxyz1234567890abcd")).toBe("PLxyz1234567890abcd")
    expect(parseYoutubePlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghij")).toBe("PLabcdefghij")
    expect(parseYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ")
    expect(parseYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(parseYoutubeVideoId("https://example.com/x")).toBeNull()
  })
  it("elle liste: link + başlık her iki sırada, linksiz satır ve tekrar atlanır", () => {
    const list = parseManualVideoList(
      "https://youtu.be/AAAAAAAAAAA Ardışık Sayılar 1\nÜslü Sayılar | https://www.youtube.com/watch?v=BBBBBBBBBBB\nnot satırı\nhttps://youtu.be/AAAAAAAAAAA tekrar\nhttps://youtu.be/CCCCCCCCCCC",
    )
    expect(list).toEqual([
      { videoId: "AAAAAAAAAAA", title: "Ardışık Sayılar 1", position: 0 },
      { videoId: "BBBBBBBBBBB", title: "Üslü Sayılar", position: 1 },
      { videoId: "CCCCCCCCCCC", title: "Video 3", position: 2 },
    ])
  })
})

describe("başlık ↔ konu eşleştirme (Türkçe normalize)", () => {
  it("konu adı başlıkta geçiyorsa (büyük harf, Türkçe karakter farkı) tam eşleşme", () => {
    expect(titleTopicScore("ARDIŞIK SAYILAR | TYT Matematik Kampı 5. Gün", "Ardışık Sayılar")).toBe(1)
    expect(matchVideoTopic("Ardisik sayilar soru cozumu", TOPICS)).toEqual({ topic_id: "ardisik", score: 1 })
  })
  it("ek toleransı: 'Fonksiyon' başlığı Fonksiyonlar konusuna, 'Bölünebilme Kuralları' Bölme ve Bölünebilme'ye", () => {
    expect(matchVideoTopic("Fonksiyon Konu Anlatımı 1", TOPICS)?.topic_id).toBe("fonk")
    expect(matchVideoTopic("Bölünebilme Kuralları | Bıyıklı Matematik", TOPICS)?.topic_id).toBe("bolme")
  })
  it("ortak kelime ('sayılar') tek başına yanlış konuya kaydırmaz: en iyi eşleşme kazanır", () => {
    expect(matchVideoTopic("Üslü Sayılar 2", TOPICS)?.topic_id).toBe("uslu")
  })
  it("eşleşme yoksa null (öğrenci elle seçer)", () => {
    expect(matchVideoTopic("Kamp tanıtımı ve çalışma taktikleri", TOPICS)).toBeNull()
  })
})

describe("hoca etkinliği", () => {
  it("izledikten sonra çözülen sorular ve anladım oranı; az veride yetersiz", () => {
    const videos = [
      { playlist_id: "biyikli", topic_id: "ardisik", watch_status: "izlendi", understanding: "anladim", watched_at: "2026-10-10T10:00:00Z" },
      { playlist_id: "biyikli", topic_id: "uslu", watch_status: "izlendi", understanding: "kismen", watched_at: "2026-10-12T10:00:00Z" },
      { playlist_id: "diger", topic_id: "fonk", watch_status: "izlendi", understanding: "anladim", watched_at: "2026-10-12T10:00:00Z" },
    ]
    const sessions = [
      { topic_id: "ardisik", date: "2026-10-09", correct: 0, total_questions: 50 }, // izlemeden önce: sayılmaz
      { topic_id: "ardisik", date: "2026-10-11", correct: 40, total_questions: 50 },
      { topic_id: "uslu", date: "2026-10-13", correct: 38, total_questions: 50 },
      { topic_id: "fonk", date: "2026-10-13", correct: 5, total_questions: 10 },
    ]
    const [b, d] = teacherStats(videos, sessions, 40)
    expect(b).toMatchObject({ playlist_id: "biyikli", watched: 2, understoodRate: 50, questions: 100, accuracy: 78, enoughData: true })
    expect(d).toMatchObject({ playlist_id: "diger", questions: 10, enoughData: false })
  })
  it("öğrenme aşaması: tüm videolar izlendi, hiçbiri anlamadım değil", () => {
    expect(videosCompleteLearning([{ watch_status: "izlendi", understanding: "kismen" }])).toBe(true)
    expect(videosCompleteLearning([{ watch_status: "izlendi", understanding: null }])).toBe(true)
    expect(videosCompleteLearning([{ watch_status: "izlendi", understanding: null }, { watch_status: "izlenmedi", understanding: null }])).toBe(false)
    expect(videosCompleteLearning([{ watch_status: "izlendi", understanding: "anlamadim" }])).toBe(false)
    expect(videosCompleteLearning([])).toBe(false)
  })
})

describe("link tipi", () => {
  const PL = "PL2wqvRc1FjTlt-yzGniaw8APzbPI4fTxm"
  it("1) playlist?list=", () => {
    expect(parseYoutubeLink(`https://www.youtube.com/playlist?list=${PL}`)).toEqual({ kind: "playlist", playlistId: PL })
    expect(parseYoutubeLink(`youtube.com/watch?list=${PL}`)).toEqual({ kind: "playlist", playlistId: PL })
  })
  it("2) playlist içindeki video (watch?v=…&list=…)", () => {
    expect(parseYoutubeLink(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}&index=3`)).toEqual({
      kind: "video_in_playlist",
      videoId: "dQw4w9WgXcQ",
      playlistId: PL,
    })
    expect(parseYoutubeLink(`https://youtu.be/dQw4w9WgXcQ?list=${PL}`)).toEqual({ kind: "video_in_playlist", videoId: "dQw4w9WgXcQ", playlistId: PL })
    // YouTube'un otomatik karışık listesi playlist sayılmaz.
    expect(parseYoutubeLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ")).toEqual({ kind: "video", videoId: "dQw4w9WgXcQ" })
  })
  it("3) tekli video watch?v=", () => {
    expect(parseYoutubeLink("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toEqual({ kind: "video", videoId: "dQw4w9WgXcQ" })
    expect(parseYoutubeLink("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ kind: "video", videoId: "dQw4w9WgXcQ" })
  })
  it("4) kısa link youtu.be/", () => {
    expect(parseYoutubeLink("https://youtu.be/dQw4w9WgXcQ?t=10")).toEqual({ kind: "video", videoId: "dQw4w9WgXcQ" })
  })
  it("5) kanal @kullanici", () => {
    expect(parseYoutubeLink("https://www.youtube.com/@biyiklimatematik")).toEqual({ kind: "channel", channel: { by: "handle", value: "@biyiklimatematik" } })
    expect(parseYoutubeLink("youtube.com/@biyiklimatematik/playlists")).toEqual({ kind: "channel", channel: { by: "handle", value: "@biyiklimatematik" } })
  })
  it("6) kanal /channel/, /c/, /user/", () => {
    expect(parseYoutubeLink("https://www.youtube.com/channel/UCxHSLxJcuZ8SpF5zgJeQ8Cg")).toEqual({
      kind: "channel",
      channel: { by: "id", value: "UCxHSLxJcuZ8SpF5zgJeQ8Cg" },
    })
    expect(parseYoutubeLink("https://www.youtube.com/c/BiyikliMatematik/videos")).toEqual({ kind: "channel", channel: { by: "custom", value: "BiyikliMatematik" } })
    expect(parseYoutubeLink("https://www.youtube.com/user/eskikanal")).toEqual({ kind: "channel", channel: { by: "user", value: "eskikanal" } })
  })
  it("geçersiz", () => {
    expect(parseYoutubeLink("https://example.com/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "invalid" })
    expect(parseYoutubeLink("https://www.youtube.com/playlist")).toEqual({ kind: "invalid" })
    expect(parseYoutubeLink("merhaba")).toEqual({ kind: "invalid" })
  })
  it("süre", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723)
    expect(parseIsoDuration("PT45S")).toBe(45)
    expect(parseIsoDuration("P0D")).toBe(0)
    expect(parseIsoDuration("x")).toBeNull()
    expect(formatClock(754)).toBe("12:34")
    expect(formatClock(3725)).toBe("1:02:05")
    expect(formatSpan(22800)).toBe("6s 20dk")
    expect(formatSpan(1500)).toBe("25dk")
    expect(formatSpan(7200)).toBe("2s")
  })
})
