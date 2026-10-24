// Maarif müfredat seed üreticisi (TYMM 2026).
//
//   node scripts/maarif/build-seed.mjs            → SQL dosyaları + docs/mufredat-kontrol.md
//   node scripts/maarif/build-seed.mjs --apply    → ayrıca canlı DB'ye uygular (service role,
//                                                   public.maarif_apply_curriculum — migration 228)
//
// Kaynak veri: supabase/seed/maarif/curriculum-2026.mjs (tek kaynak).
// Her ders için supabase/seed/maarif/seed_maarif_<sinif>_<ders>.sql: başta öğretmenin
// okuyacağı konu tablosu (yorum), sonda aynı veriyle fonksiyon çağrısı.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { CURRICULUM, CURRICULUM_VERSION, DERS_LABEL, YKS_SUBJECTS } from "../../supabase/seed/maarif/curriculum-2026.mjs"

const OUT = join("supabase", "seed", "maarif")
const DOC = join("docs", "mufredat-kontrol.md")
const UNSURE = 0.5

const COLORS = {
  matematik: "#2563EB", fizik: "#7C3AED", kimya: "#059669", biyoloji: "#16A34A", edebiyat: "#DC2626",
  tarih: "#B45309", cografya: "#0891B2", din: "#4B5563", felsefe: "#DB2777", ingilizce: "#0EA5E9",
  sosyoloji: "#9333EA", mantik: "#64748B", psikoloji: "#E11D48",
}
const DERS_ORDER = ["matematik", "fizik", "kimya", "biyoloji", "edebiyat", "tarih", "cografya", "din", "felsefe", "ingilizce", "sosyoloji", "mantik", "psikoloji"]

function parseYks(spec) {
  const m = spec.match(/^([A-Za-z]+):(.+)@([\d.]+)$/)
  if (!m || !YKS_SUBJECTS[m[1]]) throw new Error(`Geçersiz YKS eşlemesi: ${spec}`)
  return { subject: YKS_SUBJECTS[m[1]], topic: m[2], strength: Number(m[3]) }
}

function subjectPayload(entry) {
  const name = `${entry.grade}. Sınıf ${DERS_LABEL[entry.ders]}`
  const seen = new Set()
  const topics = entry.topics.map((t, i) => {
    if (seen.has(t.name)) throw new Error(`${name}: tekrar eden konu adı "${t.name}"`)
    seen.add(t.name)
    return {
      name: t.name,
      ...(t.keep ? { keep: t.keep } : {}),
      order: i + 1,
      week: t.week,
      unit: t.unit,
      yks: t.yks.map(parseYks),
    }
  })
  // Yeni listede aynı adla yaşayan konu "emekliye" ayrılmaz.
  const retire = Object.entries(entry.retire ?? {})
    .filter(([old]) => !seen.has(old))
    .map(([old, neu]) => {
      if (!seen.has(neu)) throw new Error(`${name}: "${old}" → bilinmeyen yeni konu "${neu}"`)
      return { old, new: neu }
    })
  return {
    name,
    ders_key: entry.ders,
    grade: entry.grade,
    color: COLORS[entry.ders],
    order: entry.grade * 100 + DERS_ORDER.indexOf(entry.ders) + 1,
    source: entry.source,
    topics,
    retire,
  }
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`

function seedSql(entry, payload) {
  const lines = [
    `-- seed_maarif_${entry.grade}_${entry.ders}.sql — ÜRETİLDİ (scripts/maarif/build-seed.mjs), elle düzenleme:`,
    `-- supabase/seed/maarif/curriculum-2026.mjs'i değiştirip yeniden üret.`,
    `--`,
    `-- Ders     : ${payload.name}  (müfredat ${CURRICULUM_VERSION}, Anadolu lisesi)`,
    `-- Kaynak   : ${entry.source}`,
    `-- Konu     : ${payload.topics.length}`,
    ...(entry.note ? [`-- NOT      : ${entry.note}`] : []),
    `--`,
    `-- Hafta | Ünite / Tema | Konu | TYT/AYT eşlemesi (güç; < ${UNSURE} = emin değilim)`,
    ...payload.topics.map((t) => {
      const yks = t.yks.map((y) => `${y.subject} › ${y.topic} (${y.strength}${y.strength < UNSURE ? " ?" : ""})`).join("; ") || "—"
      return `-- ${String(t.week).padStart(5)} | ${t.unit} | ${t.name}${t.keep && t.keep !== t.name ? `  [eski ad: ${t.keep}]` : ""} | ${yks}`
    }),
    ...(payload.retire.length
      ? ["--", "-- Pasife alınan eski konular → referanslarının taşındığı yeni konu:", ...payload.retire.map((r) => `--   ${r.old} → ${r.new}`)]
      : []),
    "",
    `select public.maarif_apply_curriculum(${sqlStr(JSON.stringify({ version: CURRICULUM_VERSION, subjects: [payload] }))}::jsonb);`,
    "",
  ]
  return lines.join("\n")
}

function doc(payloads) {
  const rows = CURRICULUM.map((e, i) => {
    const p = payloads[i]
    const unsure = p.topics.reduce((n, t) => n + t.yks.filter((y) => y.strength < UNSURE).length, 0)
    const noMap = p.topics.filter((t) => t.yks.length === 0).length
    return `| ${e.grade} | ${DERS_LABEL[e.ders]} | ${p.topics.length} | ${p.retire.length} | ${unsure} | ${noMap} | [plan](${e.source}) |`
  })
  const notes = CURRICULUM.flatMap((e, i) => {
    const p = payloads[i]
    const topicNotes = e.topics.filter((t) => t.note).map((t) => `  - **${t.name}:** ${t.note}`)
    if (!e.note && !topicNotes.length) return []
    return [`- **${p.name}:** ${e.note ?? ""}`, ...topicNotes]
  })
  const unsure = CURRICULUM.flatMap((e, i) =>
    payloads[i].topics.flatMap((t) =>
      t.yks.filter((y) => y.strength < UNSURE).map((y) => `| ${payloads[i].name} | ${t.name} | ${y.subject} › ${y.topic} | ${y.strength} |`),
    ),
  )
  const total = payloads.reduce((n, p) => n + p.topics.length, 0)
  return `# Maarif müfredat kontrolü (TYMM 2026, Anadolu lisesi)

> ÜRETİLDİ: \`node scripts/maarif/build-seed.mjs\`. Veri: \`supabase/seed/maarif/curriculum-2026.mjs\`.
> Ders başına SQL: \`supabase/seed/maarif/seed_maarif_<sinif>_<ders>.sql\` (başında okunabilir konu tablosu).

## Kaynaklar

- 2026-2027 taslak çerçeve yıllık planları (hafta hafta ünite/konu): https://tymm.meb.gov.tr/taslak-cerceve-planlari/ortaogretim
- Din Kültürü ve Ahlak Bilgisi planları: https://dogm.meb.gov.tr/www/cerceve-yillik-planlar/icerik/2257
- Öğretim programları: https://tymm.meb.gov.tr/ogretim-programlari · https://mufredat.meb.gov.tr
- Fen lisesi ve sosyal bilimler lisesi planları alınmadı (Anadolu lisesi esas).
- Okul haftası (\`topics.school_week\`) planlardaki "N. Hafta" numarasıdır; tatil haftaları sayılmaz
  (\`school_calendar_weeks\`: 1. hafta 14 Eylül 2026, 19. hafta 8 Şubat 2027).

## Ders/sınıf başına konu sayısı (toplam ${total})

| Sınıf | Ders | Konu | Pasife alınan eski | Emin olunmayan YKS eşlemesi | YKS eşlemesi yok | Kaynak |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## Öğretmene sorulacaklar

${notes.join("\n")}

- **Genel:** Konu granülerliği "öğrencinin konu diye algılayacağı" düzeyde seçildi; planda tek hücrede
  birden çok alt konu varsa (ör. 9. sınıf Biyoloji organik moleküller) mevcut 9. sınıf ayrımı korundu.
- **Genel:** Yazılı haftaları planlarda yok; \`school_calendar_weeks.is_exam_week\` tahmini (7-8, 15-16, 26-27, 33-34).
- **Genel:** 11. sınıf Mantık ve Psikoloji plan dosyalarında sınıf belirtilmemiş; 11 kabul edildi.

## Emin olunmayan TYT/AYT eşlemeleri (güç < ${UNSURE})

| Maarif dersi | Maarif konusu | YKS konusu | Güç |
|---|---|---|---|
${unsure.join("\n")}
`
}

const payloads = CURRICULUM.map(subjectPayload)
mkdirSync(OUT, { recursive: true })
CURRICULUM.forEach((e, i) => writeFileSync(join(OUT, `seed_maarif_${e.grade}_${e.ders}.sql`), seedSql(e, payloads[i])))
writeFileSync(DOC, doc(payloads))
console.log(`${payloads.length} ders, ${payloads.reduce((n, p) => n + p.topics.length, 0)} konu → ${OUT}, ${DOC}`)

if (process.argv.includes("--apply")) {
  const { serviceClient } = await import("../lib/env.mjs")
  const db = await serviceClient()
  const report = []
  for (const p of payloads) {
    const { data, error } = await db.rpc("maarif_apply_curriculum", { p: { version: CURRICULUM_VERSION, subjects: [p] } })
    if (error) throw new Error(`${p.name}: ${error.message}`)
    report.push(...data)
  }
  console.table(report.map((r) => ({ ...r, orphans: r.orphans.join(", "), missing_yks: r.missing_yks.join(", ") })))
  writeFileSync(join(OUT, "_apply-report.json"), JSON.stringify(report, null, 2))
}
