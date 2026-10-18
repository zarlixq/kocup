// Soru sayısı · Doğru · Yanlış · Boş çözümleyici. Form (canlı önizleme) ve
// server action (son doğrulama) AYNI fonksiyonu kullanır → tutarsızlık
// kuralları tek yerde.
//
// Kurallar:
// - Soru sayısı boşsa: boş bırakılan D/Y/B 0 sayılır, toplam = D+Y+B.
//   (Öğrenciler çoğunlukla boş'u yazmaz: "32D 6Y" → 38 soru, 0 boş.)
// - Soru sayısı doluysa: D/Y/B'den tam biri boş bırakılabilir, kalanla hesaplanır.
//   İkisi/üçü boşsa eksik bilgi.
// - Hepsi doluysa: D+Y+B = soru sayısı olmalı, değilse tutarsızlık.

export type CountField = "total" | "correct" | "wrong" | "empty"

export type CountsInput = Record<CountField, number | null>

export type ResolvedCounts = {
  total: number
  correct: number
  wrong: number
  empty: number
}

export type CountsResult =
  | ({ status: "ok"; derived: CountField[] } & ResolvedCounts)
  | { status: "incomplete" | "mismatch" | "invalid"; message: string }

export const MAX_QUESTIONS = 1000

const LABEL: Record<CountField, string> = {
  total: "Soru sayısı",
  correct: "Doğru",
  wrong: "Yanlış",
  empty: "Boş",
}

export function resolveCounts(input: CountsInput): CountsResult {
  for (const key of Object.keys(LABEL) as CountField[]) {
    const v = input[key]
    if (v == null) continue
    if (!Number.isInteger(v) || v < 0) {
      return { status: "invalid", message: `${LABEL[key]} 0 veya pozitif tam sayı olmalı.` }
    }
  }

  const parts: Exclude<CountField, "total">[] = ["correct", "wrong", "empty"]
  const missing = parts.filter((k) => input[k] == null)
  let out: ResolvedCounts
  let derived: CountField[]

  if (input.total == null) {
    if (missing.length === 3) {
      return { status: "incomplete", message: "Soru sayısını ve doğru/yanlış sayılarını gir." }
    }
    const c = input.correct ?? 0
    const w = input.wrong ?? 0
    const e = input.empty ?? 0
    out = { total: c + w + e, correct: c, wrong: w, empty: e }
    derived = ["total", ...missing]
  } else if (missing.length === 0) {
    const sum = input.correct! + input.wrong! + input.empty!
    if (sum !== input.total) {
      return {
        status: "mismatch",
        message: `Doğru + Yanlış + Boş (${sum}) soru sayısıyla (${input.total}) uyuşmuyor.`,
      }
    }
    out = { total: input.total, correct: input.correct!, wrong: input.wrong!, empty: input.empty! }
    derived = []
  } else if (missing.length === 1) {
    const field = missing[0]
    const known = parts.filter((k) => k !== field).reduce((s, k) => s + input[k]!, 0)
    const value = input.total - known
    if (value < 0) {
      return {
        status: "mismatch",
        message: `Girdiğin sayıların toplamı (${known}) soru sayısını (${input.total}) aşıyor.`,
      }
    }
    out = {
      total: input.total,
      correct: input.correct ?? value,
      wrong: input.wrong ?? value,
      empty: input.empty ?? value,
    }
    out[field] = value
    derived = [field]
  } else {
    return { status: "incomplete", message: "Doğru, yanlış ve boştan en az ikisini gir." }
  }

  if (out.total <= 0) return { status: "invalid", message: "En az 1 soru girmelisin." }
  if (out.total > MAX_QUESTIONS) {
    return { status: "invalid", message: `Tek kayıtta en fazla ${MAX_QUESTIONS} soru girilebilir.` }
  }
  return { status: "ok", derived, ...out }
}
