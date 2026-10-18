// Bilgi atomu import'unun SAF mantığı (DB'ye dokunmaz) — script ve vitest ortak.
//
// Girdi kaydı (seed/knowledge_atoms/*.json):
//   { id, konu_id, konu_adi, ad, tip, aciklama, meb_kazanim_kodu, sira, kaynak_url, related_atom_ids }
// Çıktı: DB satırları + atlanan/ertelenen/uyarı raporu.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TYPE_MAP = {
  formul: "formul",
  "formül": "formul",
  kural: "kural",
  kavram: "kavram",
  yontem: "yontem",
  "yöntem": "yontem",
}

/** "Formül", "YÖNTEM" → DB tipi; tanınmazsa null. */
export function normalizeType(tip) {
  if (typeof tip !== "string") return null
  return TYPE_MAP[tip.trim().toLocaleLowerCase("tr")] ?? null
}

function norm(s) {
  return String(s ?? "").trim().toLocaleLowerCase("tr").replace(/\s+/g, " ")
}

/** JSON dosya içeriği: dizi, tek nesne ya da { atoms: [...] }. */
export function recordsFromJson(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (parsed && Array.isArray(parsed.atoms)) return parsed.atoms
  if (parsed && typeof parsed === "object") return [parsed]
  return []
}

/**
 * @param {Array<{file: string, record: any}>} input
 * @param {{ topics: Map<string, {name: string}>, existingAtoms: Map<string, {id: string, topic_id: string, name: string}> }} db
 *   topics: DB'de var olan konular (id → ad)
 *   existingAtoms: DB'deki atomlar; anahtar `${topic_id}|${norm(name)}` → (topic, ad) çakışma kontrolü
 */
export function planImport(input, db) {
  const rows = []
  const skipped = []
  const warnings = []
  const seen = new Set()
  const missingTopics = new Map() // konu_id → { konu_adi, count }
  const batchKeys = new Map() // `${topic}|${name}` → id (batch içi çakışma)

  for (const { file, record: r } of input) {
    const where = `${file}${r?.id ? ` (${r.id})` : ""}`
    if (!r || typeof r !== "object") {
      skipped.push({ where, reason: "Geçersiz kayıt" })
      continue
    }
    if (!UUID_RE.test(String(r.id ?? ""))) {
      skipped.push({ where, reason: "id geçerli bir UUID değil" })
      continue
    }
    if (seen.has(r.id)) {
      skipped.push({ where, reason: "Tekrarlanan id (ilk kayıt kullanıldı)" })
      continue
    }
    seen.add(r.id)

    if (!UUID_RE.test(String(r.konu_id ?? ""))) {
      skipped.push({ where, reason: "konu_id geçerli bir UUID değil" })
      continue
    }
    const topic = db.topics.get(r.konu_id)
    if (!topic) {
      const m = missingTopics.get(r.konu_id) ?? { konu_adi: r.konu_adi ?? "—", count: 0 }
      m.count++
      missingTopics.set(r.konu_id, m)
      continue
    }
    const name = String(r.ad ?? "").trim()
    if (!name) {
      skipped.push({ where, reason: "ad boş" })
      continue
    }
    const type = normalizeType(r.tip)
    if (!type) {
      skipped.push({ where, reason: `Bilinmeyen tip: ${r.tip}` })
      continue
    }
    if (r.konu_adi && norm(r.konu_adi) !== norm(topic.name)) {
      warnings.push({ where, warning: `konu_adi "${r.konu_adi}" ≠ DB'deki "${topic.name}" (konu_id esas alındı)` })
    }

    const key = `${r.konu_id}|${norm(name)}`
    const dbClash = db.existingAtoms.get(key)
    if (dbClash && dbClash.id !== r.id) {
      skipped.push({ where, reason: `Aynı konuda aynı adlı başka atom var (DB id ${dbClash.id})` })
      continue
    }
    const batchClash = batchKeys.get(key)
    if (batchClash && batchClash !== r.id) {
      skipped.push({ where, reason: `Aynı konuda aynı adlı başka atom var (dosyada id ${batchClash})` })
      continue
    }
    batchKeys.set(key, r.id)

    rows.push({
      id: r.id,
      topic_id: r.konu_id,
      name,
      type,
      description: r.aciklama ?? null,
      meb_kazanim_kodu: r.meb_kazanim_kodu ?? null,
      sort_order: Number.isInteger(r.sira) ? r.sira : 0,
      source_url: r.kaynak_url ?? null,
      _related: Array.isArray(r.related_atom_ids) ? r.related_atom_ids : [],
    })
  }

  // Ön koşullar: her iki uç da (bu batch'te geçerli ya da DB'de) var olmalı.
  const known = new Set([...rows.map((r) => r.id), ...[...db.existingAtoms.values()].map((a) => a.id)])
  const prerequisites = []
  const deferred = []
  for (const r of rows) {
    for (const pre of r._related) {
      if (pre === r.id) {
        warnings.push({ where: r.id, warning: "Atom kendisine ön koşul olamaz (atlandı)" })
      } else if (known.has(pre)) {
        prerequisites.push({ atom_id: r.id, prerequisite_atom_id: pre })
      } else {
        deferred.push({ atom_id: r.id, prerequisite_atom_id: pre })
      }
    }
  }

  return {
    atoms: rows.map(({ _related, ...row }) => row),
    prerequisites,
    deferredPrerequisites: deferred,
    missingTopics: [...missingTopics.entries()].map(([konu_id, v]) => ({ konu_id, ...v })),
    skipped,
    warnings,
  }
}

export function atomKey(topicId, name) {
  return `${topicId}|${norm(name)}`
}
