import { normalizeTr } from "@/lib/yanlis-defteri/atom-search"
import { dayNumberOf } from "@/lib/resources/playlist-plan"
import { VIDEO_MATCH_HIGH_SCORE, VIDEO_MATCH_MARGIN, VIDEO_MATCH_MIN_SCORE, VIDEO_TOPIC_ALIASES } from "@/lib/upplan/config"

// Playlist videolarının konu eşleştirmesi — saf fonksiyonlar (test edilir).
//
// Sıra:
//  1) Öğrenci düzeltmeleri (aynı playlist + video için çoğunluk kararı).
//  2) Başlık temizlenir: playlist'in ortak segmentleri ("55 Günde TYT Matematik
//     Kampı"), "N. Gün", "Konu Anlatımı", "ÖSYM Yaklaşım Soruları", yıl, parça
//     numarası ("Ebob-Ekok 2"). "I. Dereceden" → "1. dereceden".
//  3) Konu: tam ifade / müfredat eş anlamlısı (1) → konunun bütün kelimeleri
//     başlıkta (0.9) → başlığın bütün kelimeleri konuda (0.85) → kelime benzerliği. Sıra sayısı içeren konu ("2. Dereceden Denklemler")
//     yalnız aynı sayıyı içeren başlığa eşlenir.
//  4) Aynı "N. Gün"ün soru videosu (ÖSYM / Yaklaşım), kendi eşleşmesi güvenli
//     değilse aynı günün konu anlatımı videosunun konusunu alır.
// Güven: skor ≥ VIDEO_MATCH_HIGH_SCORE ve ikinci adaydan VIDEO_MATCH_MARGIN
// kadar önde. Güvenli olmayan eşleşme "onay bekliyor" önerisidir.

export type MatchTopic = { id: string; name: string; /** Playlist'in kendi dersi (eşitlikte önde). */ own: boolean }
export type MatchVideo = { videoId: string; title: string }
export type MatchVia = "duzeltme" | "tam" | "kelime" | "benzerlik" | "gun"
export type VideoTopicMatch = { topic_id: string; score: number; confident: boolean; via: MatchVia }
/** Eş anlamlı tablosu (konu adı → ifadeler); varsayılan VIDEO_TOPIC_ALIASES. */
export type TopicAliases = Record<string, readonly string[]>

/** Öğrenci düzeltmesi (topic_id null = "konusuz"). */
export type TopicCorrection = { youtube_video_id: string; topic_id: string | null; updated_at: string }

const STOP = new Set(["ve", "ile", "tyt", "ayt", "konu", "giris"])
/** Tek başına konu belirtmeyen kelimeler (alt küme kuralında yeterli sayılmaz). */
const GENERIC = new Set(["problemleri", "problemler", "problem", "sayilar", "sayi", "denklemler", "kavramlar"])

const NOISE: RegExp[] = [
  /\b\d{1,3}\s*\.\s*gun\b/g,
  /\bgun\s*[-:#]?\s*\d{1,3}\b/g,
  /\bkonu anlatimi\b/g,
  /\bosym\b/g,
  /\byaklasim\b/g,
  /\bsorulari\b/g,
  /\bsorusu\b/g,
  /\bsoru cozumu\b/g,
  /\b(19|20)\d{2}\b/g,
  /\b(tyt|ayt|yks|lgs)\b/g,
]

function norm(s: string): string {
  return normalizeTr(s)
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/(?<!\d)\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Başlık segmentleri ("|" ile ayrılmış), normalize. */
function segments(title: string): string[] {
  return title
    .split(/[|｜]/)
    .map(norm)
    .filter(Boolean)
}

/** Playlist'in çoğu başlığında tekrar eden segmentler (playlist adı vb.) gürültüdür. */
export function noiseSegments(titles: string[]): Set<string> {
  const out = new Set<string>()
  if (titles.length < 3) return out
  const count = new Map<string, number>()
  for (const t of titles) for (const s of new Set(segments(t))) count.set(s, (count.get(s) ?? 0) + 1)
  for (const [s, n] of count) if (n >= Math.max(3, Math.ceil(titles.length * 0.6))) out.add(s)
  return out
}

/** Başlıktaki konu ifadesi: gürültü temizlenmiş, normalize. */
export function cleanTitle(title: string, noise: Set<string> = new Set()): string {
  const roman = title.replace(/(^|[\s|])(III|II|I)\.(?=\s)/g, (_, p: string, r: string) => `${p}${r.length}.`)
  let s = segments(roman)
    .filter((seg) => !noise.has(seg))
    .join(" ")
  for (const re of NOISE) s = s.replace(re, " ")
  s = s.replace(/\s+/g, " ").trim()
  // Parça numarası ("ebob ekok 2", "bolunebilme 1"); "1. dereceden" korunur.
  s = s.replace(/(\s+\d{1,2})+$/, "").replace(/^\d{1,2}\s+(?=[a-z])/, "")
  return s.replace(/(?<!\d)\./g, " ").replace(/\s+/g, " ").trim()
}

function tokens(s: string): string[] {
  return s.split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !/^\d+$/.test(t) && !STOP.has(t))
}

/** Türkçe ek toleransı: kısa kelimede (<4) yalnız tam eşleşme ("kar" ≠ "karisim"). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4) return false
  const stem = (t: string) => (t.length <= 4 ? t : t.slice(0, Math.max(4, t.length - 2)))
  return a.startsWith(stem(b)) || b.startsWith(stem(a))
}

const ordinals = (s: string) => new Set(Array.from(s.matchAll(/(?:^|\s)(\d{1,2})\.(?=\s|$)/g), (m) => m[1]))

/** Kelime başından itibaren içeriyor mu ("yas problem" ⊂ "yas problemleri"). */
const containsPhrase = (hay: string, needle: string) => needle.length > 2 && ` ${hay}`.includes(` ${needle}`)

/** Temizlenmiş başlık ↔ konu (0..1) ve yöntem. */
export function phraseTopicScore(phrase: string, topicName: string, aliases: TopicAliases = VIDEO_TOPIC_ALIASES): { score: number; via: MatchVia } {
  if (!phrase) return { score: 0, via: "benzerlik" }
  const name = norm(topicName)
  // Sıra sayılı konu ("2. Dereceden") yalnız aynı sayıyı içeren başlığa.
  const tOrd = ordinals(name)
  const pOrd = ordinals(phrase)
  if (tOrd.size && !Array.from(tOrd).every((n) => pOrd.has(n))) return { score: 0, via: "benzerlik" }
  if (phrase === name || containsPhrase(phrase, name)) return { score: 1, via: "tam" }
  for (const a of aliases[topicName] ?? []) if (containsPhrase(phrase, norm(a))) return { score: 1, via: "tam" }
  const tt = tokens(name)
  if (tt.length === 0) return { score: 0, via: "benzerlik" }
  const words = tokens(phrase)
  const hit = tt.filter((t) => words.some((w) => sameWord(w, t))).length
  if (hit === tt.length) return { score: 0.9, via: "kelime" }
  // Başlık ifadesinin bütün kelimeleri konuda ("kesir problemleri" ⊂ "Sayı ve Kesir Problemleri").
  if (words.length && words.every((w) => tt.some((t) => sameWord(w, t))) && words.some((w) => !GENERIC.has(w))) return { score: 0.85, via: "kelime" }
  return { score: Math.round((hit / tt.length) * 1000) / 1000, via: "benzerlik" }
}

/** Tek ifade için en iyi konu (eşik altıysa null). Güven: eşik + ikinci adaydan fark. */
export function matchPhrase(phrase: string, topics: MatchTopic[], aliases?: TopicAliases): VideoTopicMatch | null {
  const scored = topics
    .map((t) => ({ t, ...phraseTopicScore(phrase, t.name, aliases) }))
    .filter((x) => x.score >= VIDEO_MATCH_MIN_SCORE)
    .sort((a, b) => b.score - a.score || Number(b.t.own) - Number(a.t.own) || b.t.name.length - a.t.name.length)
  const best = scored[0]
  if (!best) return null
  const second = scored.find((x) => x.t.id !== best.t.id)
  // Kardeş dersteki aday, kendi dersteki eşit adayı geçemez (sıralamada önde) — farkı yine sayılır.
  const margin = second ? best.score - second.score : 1
  return { topic_id: best.t.id, score: best.score, via: best.via, confident: best.score >= VIDEO_MATCH_HIGH_SCORE && margin >= VIDEO_MATCH_MARGIN }
}

/** Video için çoğunluk düzeltmesi (eşitlikte en yeni); undefined = düzeltme yok, null = konusuz. */
export function correctionFor(corrections: TopicCorrection[], videoId: string): string | null | undefined {
  const list = corrections.filter((c) => c.youtube_video_id === videoId)
  if (!list.length) return undefined
  const tally = new Map<string, { n: number; last: string }>()
  for (const c of list) {
    const k = c.topic_id ?? ""
    const cur = tally.get(k) ?? { n: 0, last: "" }
    tally.set(k, { n: cur.n + 1, last: c.updated_at > cur.last ? c.updated_at : cur.last })
  }
  const [k] = Array.from(tally).sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))[0]
  return k || null
}

type VideoKind = "anlatim" | "soru" | null
function kindOf(title: string): VideoKind {
  const n = normalizeTr(title)
  if (/konu anlat/.test(n)) return "anlatim"
  if (/osym|yaklasim|soru/.test(n)) return "soru"
  return null
}

/** Playlist'in bütün videoları için eşleşme (videoId → eşleşme ya da null). */
export function matchPlaylistVideos(
  videos: MatchVideo[],
  topics: MatchTopic[],
  corrections: TopicCorrection[] = [],
  opts: { aliases?: TopicAliases } = {},
): Map<string, VideoTopicMatch | null> {
  const noise = noiseSegments(videos.map((v) => v.title))
  const out = new Map<string, VideoTopicMatch | null>()
  const fixed = new Set<string>()
  const phrase = new Map(videos.map((v) => [v.videoId, cleanTitle(v.title, noise)]))
  const known = new Set(topics.map((t) => t.id))
  for (const v of videos) {
    const c = correctionFor(corrections, v.videoId)
    if (c !== undefined && (c === null || known.has(c))) {
      out.set(v.videoId, c ? { topic_id: c, score: 1, confident: true, via: "duzeltme" } : null)
      fixed.add(v.videoId)
      continue
    }
    out.set(v.videoId, matchPhrase(phrase.get(v.videoId)!, topics, opts.aliases))
  }

  // Aynı gün: soru videosu, güvenli eşleşmesi yoksa aynı günün konu anlatımından.
  const byDay = new Map<number, MatchVideo[]>()
  for (const v of videos) {
    const d = dayNumberOf(v.title)
    if (d !== null) (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(v)
  }
  for (const list of byDay.values()) {
    const lectures = list.filter((v) => kindOf(v.title) === "anlatim" && out.get(v.videoId)?.confident)
    if (!lectures.length) continue
    for (const v of list) {
      if (fixed.has(v.videoId) || kindOf(v.title) !== "soru" || out.get(v.videoId)?.confident) continue
      // Günde birden çok konu anlatımı varsa ifadesi en çok benzeyen (eşitlikte sondaki).
      const words = tokens(phrase.get(v.videoId)!)
      const src = lectures
        .map((l, i) => ({ l, i, common: tokens(phrase.get(l.videoId)!).filter((t) => words.some((w) => sameWord(w, t))).length }))
        .sort((a, b) => b.common - a.common || b.i - a.i)[0].l
      const m = out.get(src.videoId)!
      out.set(v.videoId, { topic_id: m.topic_id, score: m.score, confident: true, via: "gun" })
    }
  }
  return out
}
