import { describe, expect, it } from "vitest"
import {
  cleanTitle,
  correctionFor,
  matchPhrase,
  matchPlaylistVideos,
  noiseSegments,
  phraseTopicScore,
  type MatchTopic,
} from "@/lib/resources/video-topic-match"

const T = (id: string, name: string, own = true): MatchTopic => ({ id, name, own })
const TOPICS: MatchTopic[] = [
  T("temel", "Temel Kavramlar"),
  T("tekcift", "Tek ve Çift Sayılar"),
  T("asal", "Asal Sayılar"),
  T("carpan", "Çarpanlara Ayırma"),
  T("denklem", "Denklem Çözme"),
  T("ikinci", "2. Dereceden Denklemler"),
  T("kesir", "Sayı ve Kesir Problemleri"),
  T("karzarar", "Kar - Zarar ve Faiz Problemleri"),
  T("karisim", "Karışım Problemleri"),
  T("ebob", "EBOB - EKOK"),
  T("perm", "Permütasyon - Kombinasyon"),
  T("ucgen", "Üçgenler", false),
]
const CAMP = "55 Günde TYT Matematik Kampı"

describe("başlık temizleme", () => {
  const titles = [
    `${CAMP} | 3. Gün | Tek-Çift Sayılar | Konu Anlatımı 2027`,
    `${CAMP} |3. Gün| Tek-Çift Sayılar | ÖSYM Yaklaşım Soruları 2027`,
    `${CAMP} | 11. Gün | Ebob-Ekok 2| Konu Anlatımı 2027`,
    `${CAMP} |16. Gün| I. Dereceden Denklemler | ÖSYM Yaklaşım Soruları 2027`,
  ]
  const noise = noiseSegments(titles)
  it("playlist adı, gün, 'Konu Anlatımı', 'ÖSYM', yıl ve parça numarası gider", () => {
    expect(cleanTitle(titles[0], noise)).toBe("tek cift sayilar")
    expect(cleanTitle(titles[1], noise)).toBe("tek cift sayilar")
    expect(cleanTitle(titles[2], noise)).toBe("ebob ekok")
  })
  it("Roma rakamı sıra sayısına çevrilir, sıra sayısı korunur", () => {
    expect(cleanTitle(titles[3], noise)).toBe("1. dereceden denklemler")
  })
})

describe("ifade ↔ konu", () => {
  it("tam ifade ve müfredat eş anlamlısı 1; bütün kelimeler 0.9; alt küme 0.85", () => {
    expect(phraseTopicScore("ebob ekok", "EBOB - EKOK")).toEqual({ score: 1, via: "tam" })
    expect(phraseTopicScore("kartezyen carpim", "Kümeler")).toEqual({ score: 1, via: "tam" })
    expect(phraseTopicScore("tek cift sayilar", "Tek ve Çift Sayılar")).toEqual({ score: 0.9, via: "kelime" })
    expect(phraseTopicScore("kesir problemleri", "Sayı ve Kesir Problemleri", {})).toEqual({ score: 0.85, via: "kelime" })
  })
  it("'1. Dereceden' ile '2. Dereceden' ayırt edilir", () => {
    expect(phraseTopicScore("1. dereceden denklemler", "2. Dereceden Denklemler").score).toBe(0)
    expect(phraseTopicScore("2. dereceden denklemler", "2. Dereceden Denklemler").score).toBe(1)
    expect(matchPhrase("1. dereceden denklemler", TOPICS)).toMatchObject({ topic_id: "denklem", confident: true })
  })
  it("kısa kelime kök toleransı almaz: 'kar' ≠ 'karışım'", () => {
    expect(matchPhrase("kar zarar problemleri", TOPICS, {})?.topic_id).toBe("karzarar")
  })
  it("düşük skor ya da iki aday yakınsa güvenli değil (onay bekliyor)", () => {
    expect(matchPhrase("asal carpanlar", TOPICS, {})).toMatchObject({ confident: false })
    expect(matchPhrase("kamp tanitimi", TOPICS)).toBeNull()
  })
  it("kardeş ders (Geometri) eşleşir; eşitlikte kendi dersi önde", () => {
    expect(matchPhrase("ucgenler", TOPICS)?.topic_id).toBe("ucgen")
    const tie = [T("m", "Olasılık"), T("g", "Olasılık", false)]
    expect(matchPhrase("olasilik", tie)?.topic_id).toBe("m")
  })
})

describe("playlist eşleştirmesi", () => {
  it("aynı günün ÖSYM videosu konu anlatımının konusunu alır", () => {
    const videos = [
      { videoId: "a", title: `${CAMP} | 7. Gün | Asal Sayılar | Konu Anlatımı 2027` },
      { videoId: "b", title: `${CAMP} | 7. Gün | Bölen Sayısı | ÖSYM Yaklaşım Soruları 2027` },
      { videoId: "c", title: `${CAMP} | 8. Gün | Ebob-Ekok | Konu Anlatımı 2027` },
      { videoId: "d", title: `${CAMP} | 8. Gün | Karışım Problemleri | ÖSYM Yaklaşım Soruları 2027` },
    ]
    const r = matchPlaylistVideos(videos, TOPICS)
    expect(r.get("a")).toMatchObject({ topic_id: "asal", via: "tam" })
    expect(r.get("b")).toMatchObject({ topic_id: "asal", via: "gun", confident: true })
    // Kendi güvenli eşleşmesi olan soru videosu değişmez.
    expect(r.get("d")).toMatchObject({ topic_id: "karisim", via: "tam" })
  })

  it("öğrenci düzeltmesi önce: çoğunluk kararı, konusuz da bir karar", () => {
    const videos = [
      { videoId: "x", title: "Kamp tanıtımı" },
      { videoId: "y", title: "Periyodik Durum İçeren Problemler" },
    ]
    const corr = [
      { youtube_video_id: "x", topic_id: null, updated_at: "2026-10-01" },
      { youtube_video_id: "y", topic_id: "karisim", updated_at: "2026-10-01" },
      { youtube_video_id: "y", topic_id: "kesir", updated_at: "2026-10-02" },
      { youtube_video_id: "y", topic_id: "kesir", updated_at: "2026-10-03" },
    ]
    expect(correctionFor(corr, "y")).toBe("kesir")
    const r = matchPlaylistVideos(videos, TOPICS, corr)
    expect(r.get("x")).toBeNull()
    expect(r.get("y")).toMatchObject({ topic_id: "kesir", via: "duzeltme", confident: true })
  })
})
