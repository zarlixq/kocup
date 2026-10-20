import type { ProgramItem } from "@/components/program/weekly-program-board"
import { shortTime } from "@/lib/program/item-schema"

// weekly_program_items select'i — öğrenci, koç ve müdür program sayfaları ortak.
export const PROGRAM_ITEM_COLUMNS =
  "id, day_of_week, start_time, end_time, subject_id, topic_id, baslik, aciklama, hedef_soru, is_completed, carried_from_item_id, created_by_role, block_type, subjects(id, name, color), topics(name)"

export type RawProgramItem = {
  id: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  subject_id: string | null
  topic_id: string | null
  baslik: string | null
  aciklama: string | null
  hedef_soru: number | null
  is_completed: boolean
  carried_from_item_id: string | null
  created_by_role: string
  block_type?: string | null
  subjects: { id: string; name: string; color: string | null } | null
  topics: { name: string } | null
}

export function mapProgramItem(r: RawProgramItem): ProgramItem {
  return {
    id: r.id,
    day_of_week: r.day_of_week,
    start_time: shortTime(r.start_time),
    end_time: shortTime(r.end_time),
    subject_id: r.subject_id,
    topic_id: r.topic_id,
    topic_name: r.topics?.name ?? null,
    baslik: r.baslik,
    aciklama: r.aciklama,
    hedef_soru: r.hedef_soru,
    is_completed: r.is_completed,
    block_type: r.block_type ?? null,
    created_by_role: r.created_by_role === "student" || r.created_by_role === "ai" ? r.created_by_role : "coach",
    subject: r.subjects ? { id: r.subjects.id, name: r.subjects.name, color: r.subjects.color } : null,
  }
}
