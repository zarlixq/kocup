import { UNKNOWN_TYPES, type ErrorType } from "@/lib/yanlis-defteri/constants"

// Deneme yanlış paneli durumu — saf fonksiyonlar (UI ve test aynı kuralı kullanır).
//
// Konu başına gruplar: (hata tipi, atom) → sayı. groups[0] "birincil" gruptur:
// chip'e basış ona +1 ekler, tip/atom seçici onu değiştirir. Yanlış defterinde
// tek tek düzenlenmiş farklı tipli satırlar diğer gruplarda korunur.

export type WrongGroup = { error_type: ErrorType | null; knowledge_atom_id: string | null; count: number }
export type TopicWrongs = { groups: WrongGroup[] }
/** topicId → gruplar (tek ders). */
export type SubjectWrongs = Record<string, TopicWrongs>

export type ExamWrongRow = { topic_id: string; error_type: ErrorType | null; knowledge_atom_id: string | null }
export type ExamRpcItem = { topic_id: string; error_type: ErrorType | null; knowledge_atom_id: string | null; count: number }

export function topicCount(t: TopicWrongs | undefined): number {
  return t ? t.groups.reduce((s, g) => s + g.count, 0) : 0
}

export function subjectTotal(s: SubjectWrongs): number {
  return Object.values(s).reduce((sum, t) => sum + topicCount(t), 0)
}

/** Chip'e basış: +1, dersin toplam yanlışını geçemez. */
export function incrementTopic(s: SubjectWrongs, topicId: string, maxWrong: number): SubjectWrongs {
  if (subjectTotal(s) >= maxWrong) return s
  const cur = s[topicId]
  const groups = cur ? cur.groups.map((g) => ({ ...g })) : [{ error_type: null, knowledge_atom_id: null, count: 0 }]
  groups[0].count += 1
  return { ...s, [topicId]: { groups } }
}

/** −1: önce birincil gruptan, o boşsa sondaki dolu gruptan. Konu sıfırlanırsa silinir. */
export function decrementTopic(s: SubjectWrongs, topicId: string): SubjectWrongs {
  const cur = s[topicId]
  if (!cur || topicCount(cur) === 0) return s
  const groups = cur.groups.map((g) => ({ ...g }))
  let idx = groups[0].count > 0 ? 0 : -1
  if (idx < 0) for (let i = groups.length - 1; i > 0; i--) if (groups[i].count > 0) { idx = i; break }
  groups[idx].count -= 1
  const kept = groups.filter((g, i) => i === 0 || g.count > 0)
  const out = { ...s }
  if (kept.reduce((n, g) => n + g.count, 0) === 0) delete out[topicId]
  else out[topicId] = { groups: kept }
  return out
}

/** Birincil grubun hata tipi. Atom yalnız "bilmiyordum" tiplerinde ya da tipsizken anlamlı. */
export function setTopicType(s: SubjectWrongs, topicId: string, type: ErrorType | null): SubjectWrongs {
  const cur = s[topicId]
  if (!cur) return s
  const groups = cur.groups.map((g) => ({ ...g }))
  groups[0].error_type = type
  if (type !== null && !UNKNOWN_TYPES.includes(type)) groups[0].knowledge_atom_id = null
  return { ...s, [topicId]: { groups } }
}

export function setTopicAtom(s: SubjectWrongs, topicId: string, atomId: string | null): SubjectWrongs {
  const cur = s[topicId]
  if (!cur) return s
  const groups = cur.groups.map((g) => ({ ...g }))
  groups[0].knowledge_atom_id = atomId
  return { ...s, [topicId]: { groups } }
}

export function atomAllowed(type: ErrorType | null): boolean {
  return type === null || UNKNOWN_TYPES.includes(type)
}

/** Panel durumu → set_exam_wrong_answers listesi. */
export function toExamRpcItems(bySubject: Record<string, SubjectWrongs>): ExamRpcItem[] {
  const items: ExamRpcItem[] = []
  for (const s of Object.values(bySubject)) {
    for (const [topicId, t] of Object.entries(s)) {
      for (const g of t.groups) if (g.count > 0) items.push({ topic_id: topicId, ...g })
    }
  }
  return items
}

/** Mevcut satırlar → panel durumu: konu başına en kalabalık grup birincil olur. */
export function fromExamRows(
  rows: ExamWrongRow[],
  subjectOfTopic: (topicId: string) => string | undefined,
): Record<string, SubjectWrongs> {
  const out: Record<string, SubjectWrongs> = {}
  for (const r of rows) {
    const sid = subjectOfTopic(r.topic_id)
    if (!sid) continue
    const subj = (out[sid] ??= {})
    const t = (subj[r.topic_id] ??= { groups: [] })
    const g = t.groups.find((x) => x.error_type === r.error_type && x.knowledge_atom_id === r.knowledge_atom_id)
    if (g) g.count += 1
    else t.groups.push({ error_type: r.error_type, knowledge_atom_id: r.knowledge_atom_id, count: 1 })
  }
  for (const subj of Object.values(out)) for (const t of Object.values(subj)) t.groups.sort((a, b) => b.count - a.count)
  return out
}
