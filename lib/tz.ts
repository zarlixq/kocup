// Türkiye saati (Europe/Istanbul) yıl boyu UTC+3'tür; 2016'dan beri DST yoktur.
// Sunucu UTC'de çalışsa bile "bugün" hesabı Istanbul takvimine göre yapılmalı,
// aksi halde 00:00–02:59 arası UTC hâlâ önceki gündedir ve gün penceresi kayar.
const IST_OFFSET = "+03:00"

// Verilen anın Istanbul takvimindeki gününü YYYY-MM-DD döndürür.
export function istanbulDateStr(now: Date = new Date()): string {
  // en-CA locale'i YYYY-MM-DD formatı verir.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

// Verilen anın Istanbul takvim gününün [başlangıç, bitiş) UTC instant aralığı.
// appointments.start_time (timestamptz) sorguları için kullanılır.
export function istanbulDayRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(`${istanbulDateStr(now)}T00:00:00${IST_OFFSET}`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000) // DST yok → sabit 24s
  return { start, end }
}

// Istanbul takviminde bugünden n gün önceki günü YYYY-MM-DD döndürür (n=0 → bugün).
// DATE kolonu karşılaştırmaları (study_sessions.date gibi) için gün-sınırı doğru olur.
export function istanbulDaysAgoStr(n: number, now: Date = new Date()): string {
  const [y, m, d] = istanbulDateStr(now).split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d)) // takvim gününü UTC'de sabitle (TZ-bağımsız aritmetik)
  t.setUTCDate(t.getUTCDate() - n)
  return t.toISOString().slice(0, 10)
}

// Verilen anın Istanbul takviminde içinde bulunduğu haftanın Pazartesi'si (YYYY-MM-DD).
export function istanbulWeekStartStr(now: Date = new Date()): string {
  const [y, m, d] = istanbulDateStr(now).split("-").map(Number)
  // Date.UTC ile takvim gününü sabitle; getUTCDay bu takvim gününün haftalık gününü verir.
  const anchor = new Date(Date.UTC(y, m - 1, d))
  const dow = anchor.getUTCDay() // 0=Paz .. 6=Cts
  const diff = dow === 0 ? -6 : 1 - dow
  anchor.setUTCDate(anchor.getUTCDate() + diff)
  return anchor.toISOString().slice(0, 10)
}
