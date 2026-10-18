import { ERROR_TYPES, UNKNOWN_TYPES, type ErrorType } from "@/lib/yanlis-defteri/constants"

// Yanlış giriş paneli durumu — saf fonksiyonlar (UI ve test aynı kuralı kullanır).
//
//   typeCounts : Kademe 1, hata tipi başına sayaç (toplam ≤ yanlış sayısı)
//   atomCounts : Kademe 2, "bilmiyordum" yanlışlarının atomlara dağılımı
//                (toplam ≤ bilgi_eksik + hic_fikrim_yok). Atanmayan kısım
//                "emin değilim" sayılır (atom boş satır).

export type TypeCounts = Record<ErrorType, number>
export type AtomCounts = Record<string, number>

export type WrongRow = { error_type: ErrorType; knowledge_atom_id: string | null }

export type RpcItem = { error_type: ErrorType; knowledge_atom_id: string | null; count: number }

export function emptyTypeCounts(): TypeCounts {
  return { bilgi_eksik: 0, islem_hatasi: 0, dikkat_okuma: 0, sure_yetmedi: 0, hic_fikrim_yok: 0 }
}

export function sumCounts(c: Record<string, number>): number {
  return Object.values(c).reduce((s, v) => s + v, 0)
}

export function unknownTotal(t: TypeCounts): number {
  return UNKNOWN_TYPES.reduce((s, k) => s + t[k], 0)
}

/** Sayaç +1 — toplam yanlış sayısını geçemez. */
export function incrementType(t: TypeCounts, type: ErrorType, maxWrong: number): TypeCounts {
  if (sumCounts(t) >= maxWrong) return t
  return { ...t, [type]: t[type] + 1 }
}

/**
 * Sayaç −1. "Bilmiyordum" havuzu küçülürse fazla atom atamaları sondan budanır,
 * böylece atomCounts hiçbir zaman havuzu aşmaz.
 */
export function decrementType(
  t: TypeCounts,
  a: AtomCounts,
  type: ErrorType,
): { types: TypeCounts; atoms: AtomCounts } {
  if (t[type] <= 0) return { types: t, atoms: a }
  const types = { ...t, [type]: t[type] - 1 }
  return { types, atoms: trimAtoms(a, unknownTotal(types)) }
}

export function trimAtoms(a: AtomCounts, limit: number): AtomCounts {
  let excess = sumCounts(a) - limit
  if (excess <= 0) return a
  const out: AtomCounts = { ...a }
  for (const id of Object.keys(out).reverse()) {
    if (excess <= 0) break
    const take = Math.min(out[id], excess)
    out[id] -= take
    excess -= take
    if (out[id] === 0) delete out[id]
  }
  return out
}

/** Atom chip'ine basış: havuz doluysa değişmez. */
export function incrementAtom(t: TypeCounts, a: AtomCounts, atomId: string): AtomCounts {
  if (sumCounts(a) >= unknownTotal(t)) return a
  return { ...a, [atomId]: (a[atomId] ?? 0) + 1 }
}

export function decrementAtom(a: AtomCounts, atomId: string): AtomCounts {
  const cur = a[atomId] ?? 0
  if (cur <= 0) return a
  const out = { ...a, [atomId]: cur - 1 }
  if (out[atomId] === 0) delete out[atomId]
  return out
}

/**
 * Panel durumu → RPC listesi (set_session_wrong_answers). Atomlar önce
 * bilgi_eksik satırlarına, taşan kısım hic_fikrim_yok satırlarına yazılır.
 */
export function toRpcItems(t: TypeCounts, a: AtomCounts): RpcItem[] {
  const items: RpcItem[] = []
  const remaining: Record<string, number> = { bilgi_eksik: t.bilgi_eksik, hic_fikrim_yok: t.hic_fikrim_yok }
  for (const [atomId, n] of Object.entries(a)) {
    let left = n
    for (const type of UNKNOWN_TYPES) {
      const take = Math.min(left, remaining[type])
      if (take > 0) {
        items.push({ error_type: type, knowledge_atom_id: atomId, count: take })
        remaining[type] -= take
        left -= take
      }
    }
  }
  for (const type of ERROR_TYPES) {
    const n = UNKNOWN_TYPES.includes(type) ? remaining[type] : t[type]
    if (n > 0) items.push({ error_type: type, knowledge_atom_id: null, count: n })
  }
  return items
}

/** Mevcut satırlar → panel durumu (düzenleme açılışı). */
export function fromRows(rows: WrongRow[]): { types: TypeCounts; atoms: AtomCounts } {
  const types = emptyTypeCounts()
  const atoms: AtomCounts = {}
  for (const r of rows) {
    types[r.error_type] += 1
    if (r.knowledge_atom_id && UNKNOWN_TYPES.includes(r.error_type)) {
      atoms[r.knowledge_atom_id] = (atoms[r.knowledge_atom_id] ?? 0) + 1
    }
  }
  return { types, atoms }
}

/**
 * Kademe 2 chip sırası: öğrencinin bu konuda geçmişte en çok yanlış yaptığı
 * atomlar önce, sonra müfredat sırası.
 */
export function orderAtoms<T extends { id: string; sort_order: number }>(
  atoms: T[],
  history: Record<string, number>,
): T[] {
  return [...atoms].sort((x, y) => (history[y.id] ?? 0) - (history[x.id] ?? 0) || x.sort_order - y.sort_order)
}
