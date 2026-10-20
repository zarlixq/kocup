// Atom araması — saf fonksiyonlar (AtomPicker ve test aynı kuralı kullanır).
//
// Ders grubunun (lib/curriculum/subject-groups.ts) tüm aktif konularındaki
// atomlar bir kez yüklenir, arama tamamen istemcide yapılır.
//
// EŞLEŞME: sorgu kelimelere bölünür, her kelime atomun adında ya da
// açıklamasında geçmeli (VE). Türkçe karakter ve büyük/küçük harf duyarsız.
//
// SIRALAMA (öncelik sırasıyla):
//   1) kelime başı eşleşme (her kelime bir kelimenin başında) > kelime içi
//   2) seçili konunun atomu > öğrencinin geçmişte seçtiği atom > dersin geri kalanı
//   3) geçmişte daha çok seçilen önce
//   4) adda eşleşen > yalnız açıklamada eşleşen
//   5) konu sırası, sonra konudaki müfredat sırası

export type CatalogAtom = {
  id: string
  name: string
  type: string
  description: string | null
  sort_order: number
  topic_id: string
  topic_name: string
  topic_order: number
}

/** Aramaya hazır atom: normalize metinler bir kez hesaplanır. */
export type IndexedAtom = CatalogAtom & { normName: string; normDesc: string }

const TR_MAP: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" }

/** "İstisnalar" → "istisnalar", "ÇARPANLAR" → "carpanlar", "â" → "a". */
export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[ışğüöç]/g, (c) => TR_MAP[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function indexAtoms(atoms: CatalogAtom[]): IndexedAtom[] {
  return atoms.map((a) => ({ ...a, normName: normalizeTr(a.name), normDesc: normalizeTr(a.description ?? "") }))
}

/** 0 = kelime başında, 1 = kelime içinde, -1 = yok. */
function matchAt(text: string, token: string): 0 | 1 | -1 {
  let i = text.indexOf(token)
  if (i < 0) return -1
  while (i >= 0) {
    if (i === 0 || !/[a-z0-9]/.test(text[i - 1])) return 0
    i = text.indexOf(token, i + 1)
  }
  return 1
}

export type AtomHit = { atom: IndexedAtom; wordStart: boolean; inName: boolean }

export function searchAtoms(
  atoms: IndexedAtom[],
  query: string,
  opts: { topicId: string | null; history: Record<string, number>; limit?: number },
): AtomHit[] {
  const tokens = normalizeTr(query).split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.length === 0) return []

  const hits: AtomHit[] = []
  for (const atom of atoms) {
    let wordStart = true
    let inName = true
    let ok = true
    for (const t of tokens) {
      const n = matchAt(atom.normName, t)
      const d = n === 0 ? -1 : matchAt(atom.normDesc, t)
      if (n < 0 && d < 0) {
        ok = false
        break
      }
      if (n < 0) inName = false
      if (n !== 0 && d !== 0) wordStart = false
    }
    if (ok) hits.push({ atom, wordStart, inName })
  }

  const bucket = (a: IndexedAtom) => (a.topic_id === opts.topicId ? 0 : (opts.history[a.id] ?? 0) > 0 ? 1 : 2)
  hits.sort(
    (x, y) =>
      Number(y.wordStart) - Number(x.wordStart) ||
      bucket(x.atom) - bucket(y.atom) ||
      (opts.history[y.atom.id] ?? 0) - (opts.history[x.atom.id] ?? 0) ||
      Number(y.inName) - Number(x.inName) ||
      x.atom.topic_order - y.atom.topic_order ||
      x.atom.sort_order - y.atom.sort_order,
  )
  return opts.limit ? hits.slice(0, opts.limit) : hits
}
