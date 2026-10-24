import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/database.types"
import { loadAssignmentsWithProgress } from "@/lib/assignments/load"
import { ensureProgram } from "@/lib/program/ensure-program"
import { istanbulDateStr } from "@/lib/tz"
import {
  ALAN_PUAN_TURU,
  FORGETTING_REVIEW_RATIO,
  NO_DATA_MASTERY,
  SPACED_REVIEW_DAYS,
} from "@/lib/upplan/config"
import { isBreakDay, loadExamCalendar, loadSchoolCalendar, schoolPosition, examFor } from "@/lib/upplan/calendar"
import { examYearFor, isContextBasedExamYear, isYksPoolTrack } from "@/lib/upplan/track"
import { schoolYearEnd } from "@/lib/upplan/roadmap-maarif"
import { coreSubjectId, heavySubjectIds, lowValueSubjectIds, skeletonFor, subjectWeightsFor } from "@/lib/upplan/week-skeleton"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { addDaysIso, blockTypeFor, daysBetweenIso, practiceGroupOf } from "@/lib/upplan/roadmap"
import {
  availableMinutes,
  type RoadmapPayload,
  loadMasteryInfo,
  loadMinutesPerQuestion,
  parsePayload,
  readiness,
  weeksUntil,
} from "@/lib/upplan/roadmap-service"
import {
  scheduleWeek,
  spacedReviewsDue,
  weekRulesFor,
  type DraftItem,
  type PracticeGroupInput,
  type ProgramGoal,
  type ProgramPlaylistTopic,
  type ProgramReview,
  type VideoDay,
} from "@/lib/upplan/scheduler"
import { isoWeekday, UNKNOWN_VIDEO_MINUTES } from "@/lib/resources/playlist-plan"
import { loadPlaylistScope } from "@/lib/upplan/playlist-scope"
import { coveredNotBefore, playlistReached, playlistShortLabel } from "@/lib/upplan/playlist-order"

type Client = SupabaseClient<Database>

// Haftalık program taslağı: üret → (öğrenci onaylar | koç kabul eder) → weekly_program_items.
// Mevcut kalemler (öğrenci/koç/önceki onaylar) korunur; scheduler onların etrafına yerleştirir.
// Program YALNIZ onaylı yol haritasından türetilir: yol haritası yoksa ya da
// onaylanmadıysa taslak üretilmez; hedefler yol haritasındaki konularla sınırlı.

export const ROADMAP_REQUIRED_ERROR = "Önce yol haritanı oluştur ve onayla; program yol haritasından üretilir."

/** Hedefin programdaki öğrenme durumu (scheduler girdisi). */
export function learningFlags(
  g: { id: string; learning_phase: string | null; learned_at: string | null; cozulen_soru: number },
  blockType: string,
  lectureDone: Set<string>,
): { lecture_pending: boolean; short_review_pending: boolean } {
  if (lectureDone.has(g.id) || g.learned_at) return { lecture_pending: false, short_review_pending: false }
  // Aşaması kaydedilmemiş eski hedef: konu çalışması şablonu ve hiç soru yok → konu çalışması.
  const phase = g.learning_phase ?? (blockType === "konu_calisma" && g.cozulen_soru === 0 ? "gerekli" : "yok")
  return { lecture_pending: phase === "gerekli", short_review_pending: phase === "opsiyonel" }
}

export type ProgramDraftMeta = {
  examCount: number
  blockCount: number
  capacityBlocks: number
  unplaced: number
  studyMinutes: number
  focusMinutes: number
  videoMinutes?: number
  videoOverflowMinutes?: number
  /** Süre dağılımı (konu / soru / tekrar / analiz / video, dk). */
  composition?: { konu: number; soru: number; tekrar: number; analiz: number; video: number }
  track?: string
  warnings?: string[]
  /** "Bu haftayı yeniden oluştur": onayda yerini yeni taslağa bırakacak UpPlan kalemleri. */
  replaceItemIds?: string[]
}

/**
 * "Bu haftayı yeniden oluştur" ile değişecek kalemler: UpPlan'ın yazdığı
 * (created_by_role='ai'), tamamlanmamış, bugün ya da sonraki günlerdeki kalemler.
 * Tamamlananlar, öğrencinin/koçun elle eklediği kalemler ve geçmiş günler
 * (uyum geçmişi) korunur.
 */
export function replaceableItems<T extends { day_of_week: number; created_by_role: string; is_completed: boolean }>(
  items: T[],
  weekStart: string,
  today: string,
): T[] {
  return items.filter((i) => i.created_by_role === "ai" && !i.is_completed && addDaysIso(weekStart, i.day_of_week - 1) >= today)
}

/** Haftanın değişecek ve korunacak kalem sayısı (onay dialogu için). */
export async function countReplaceableItems(
  admin: Client,
  studentId: string,
  weekStart: string,
  today = istanbulDateStr(),
): Promise<{ replace: number; keep: number }> {
  const { data } = await admin
    .from("weekly_programs")
    .select("weekly_program_items(id, day_of_week, created_by_role, is_completed)")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle()
  const items = data?.weekly_program_items ?? []
  const replace = replaceableItems(items, weekStart, today).length
  return { replace, keep: items.length - replace }
}

/** Program bloğu başlığı bu önekle başlıyorsa playlist video bloğudur. */
export const VIDEO_BLOCK_PREFIX = "Video: "

/**
 * Haftanın playlist video günleri (aktif playlist, izlenmemiş, planlı).
 * Gün × playlist başına bir kayıt; süre bilinmeyen video UNKNOWN_VIDEO_MINUTES.
 * Programda o gün zaten video bloğu varsa (önceki onay) tekrar konmaz.
 */
export async function loadVideoDays(
  db: Client,
  studentId: string,
  weekStart: string,
  existing: { day_of_week: number; baslik?: string | null }[],
): Promise<VideoDay[]> {
  const { data, error } = await db
    .from("student_resource_videos")
    .select("planned_date, duration_seconds, topic_id, match_status, playlist_id, student_resource_playlists!inner(title, teacher_name, channel_title, subject_id, status)")
    .eq("student_id", studentId)
    .eq("watch_status", "izlenmedi")
    .gte("planned_date", weekStart)
    .lte("planned_date", addDaysIso(weekStart, 6))
    .eq("student_resource_playlists.status", "aktif")
  if (error) console.error("loadVideoDays", error)
  const hasVideoBlock = new Set(existing.filter((i) => i.baslik?.startsWith(VIDEO_BLOCK_PREFIX)).map((i) => i.day_of_week))
  const map = new Map<string, VideoDay & { count: number; name: string }>()
  for (const v of data ?? []) {
    const day = isoWeekday(v.planned_date!)
    if (hasVideoBlock.has(day)) continue
    const p = v.student_resource_playlists
    const key = `${day}:${v.playlist_id}`
    const cur = map.get(key) ?? {
      day_of_week: day,
      minutes: 0,
      subject_id: p.subject_id,
      label: "",
      topic_ids: [],
      count: 0,
      name: (p.title?.trim() || p.channel_title || p.teacher_name).slice(0, 80),
    }
    cur.minutes += (v.duration_seconds ?? UNKNOWN_VIDEO_MINUTES * 60) / 60
    cur.count += 1
    if (v.topic_id && v.match_status !== "eslesmedi" && !cur.topic_ids.includes(v.topic_id)) cur.topic_ids.push(v.topic_id)
    map.set(key, cur)
  }
  return Array.from(map.values())
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map(({ count, name, ...d }) => ({ ...d, label: `${name} (${count} video)` }))
}

export function isDraftItem(v: unknown): v is DraftItem {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.day_of_week === "number" && typeof o.start_time === "string" && typeof o.end_time === "string" && typeof o.baslik === "string"
}

export function parseDraftItems(v: Json | null | undefined): DraftItem[] {
  return Array.isArray(v) ? v.filter(isDraftItem) : []
}

export type ProgramBuildOptions = {
  /** true: değişecek UpPlan kalemleri yokmuş gibi yerleştir; onayda silinip yerine bu taslak yazılır. */
  replace?: boolean
  /**
   * Önizleme (debug / önce-sonra karşılaştırması): kayıtlı onaylı yol haritası yerine
   * bu yol haritası; hedefler topic_assignments yerine onun "aktif" kalemlerinden. Yazma yok.
   */
  previewRoadmap?: RoadmapPayload
}

/** Taslak üretir ve kaydeder (koçlu öğrencide koca_onerildi). */
export async function generateProgramDraft(
  admin: Client,
  studentId: string,
  weekStart: string,
  today = istanbulDateStr(),
  opts: { replace?: boolean } = {},
): Promise<{ items: DraftItem[]; meta: ProgramDraftMeta; coached: boolean } | { error: string }> {
  const built = await buildProgramDraft(admin, studentId, weekStart, today, opts)
  if ("error" in built) return built
  const { items, meta, coached } = built
  const { error } = await admin.from("upplan_program_drafts").upsert({
    student_id: studentId,
    week_start: weekStart,
    status: coached ? "koca_onerildi" : "taslak",
    items: items as unknown as Json,
    meta: meta as unknown as Json,
    generated_at: new Date().toISOString(),
    decided_at: null,
    decided_by: null,
  })
  if (error) {
    console.error("generateProgramDraft", error)
    return { error: "Program taslağı kaydedilemedi." }
  }
  return built
}

/** Haftalık program taslağını hesaplar (yazma yok). */
export async function buildProgramDraft(
  admin: Client,
  studentId: string,
  weekStart: string,
  today = istanbulDateStr(),
  opts: ProgramBuildOptions = {},
): Promise<{ items: DraftItem[]; meta: ProgramDraftMeta; coached: boolean } | { error: string }> {
  const profile = await loadUpplanProfile(admin, studentId)
  if (!profile) return { error: "Önce UpPlan kurulumunu tamamla." }
  // Fail-loud: track ya da müsaitlik yoksa program üretilmez.
  const ready = readiness(profile, today)
  if ("error" in ready) return { error: ready.error }
  const track = ready.track
  if (availableMinutes(profile) === 0) return { error: "Müsaitlik ızgaran boş; önce çalışabileceğin saatleri işaretle." }

  const preview = opts.previewRoadmap
  const { data: roadmap } = preview ? { data: null } : await admin.from("upplan_roadmaps").select("status, payload").eq("student_id", studentId).maybeSingle()
  const payload = preview ?? parsePayload(roadmap?.payload)
  if (!payload || (!preview && roadmap?.status !== "onaylandi")) return { error: ROADMAP_REQUIRED_ERROR }
  const roadmapTopics = new Set(payload.items.map((i) => i.topic_id))
  const roadmapItem = new Map(payload.items.map((i) => [i.topic_id, i]))

  const weekEnd = addDaysIso(weekStart, 6)
  const [{ data: student }, assignmentGoals, mastery, mpq, { data: program }, playlist, { data: queued }, school, examCal, { data: subjectRows }] = await Promise.all([
    admin.from("students").select("coach_id").eq("id", studentId).maybeSingle(),
    loadAssignmentsWithProgress(admin, { studentId }),
    loadMasteryInfo(admin, studentId),
    loadMinutesPerQuestion(admin, studentId),
    (preview ? { data: null } : admin
      .from("weekly_programs")
      .select("id, weekly_program_items(id, day_of_week, start_time, end_time, assignment_id, block_type, topic_id, baslik, created_by_role, is_completed)")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle()),
    loadPlaylistScope(admin, studentId),
    // Playlist konusu bu hafta içinde plan gününe geliyorsa sıradaki hedefi de programa girer.
    admin
      .from("topic_assignments")
      .select("id, topic_id, hedef_soru, son_tarih, block_type, learning_phase, learned_at, topics(name, subject_id, subjects(name))")
      .eq("student_id", studentId)
      .eq("origin", "upplan")
      .eq("status", "sirada")
      .lte("baslangic_tarihi", weekEnd),
    loadSchoolCalendar(admin, weekStart),
    loadExamCalendar(admin),
    admin.from("subjects").select("id, name, ders_key, exam_type"),
  ])
  const goals = preview ? previewGoals(preview, assignmentGoals, weekStart) : assignmentGoals
  const programItems = program?.weekly_program_items ?? []
  const replaced = opts.replace ? replaceableItems(programItems, weekStart, today) : []
  const replacedIds = new Set(replaced.map((i) => i.id))
  const existingItems = programItems.filter((i) => !replacedIds.has(i.id))
  const scope = playlist.topics
  // Kapsamdaki derste (playlist bu hafta sürüyor) UpPlan yalnız playlist konularını
  // programlar; playlist'te olmayan konular playlist bitince (öğrenci/koç hedefi korunur).
  const firstDay = weekStart < today ? today : weekStart
  const waitsForPlaylist = (topicId: string, subjectId: string) => !scope[topicId] && (coveredNotBefore(playlist.subjects, subjectId) ?? "") > firstDay
  const linked = new Map<string, number>()
  for (const i of existingItems) if (i.assignment_id) linked.set(i.assignment_id, (linked.get(i.assignment_id) ?? 0) + 1)
  const lectureDone = new Set(existingItems.filter((i) => i.block_type === "konu_calisma" && i.assignment_id).map((i) => i.assignment_id!))

  const programGoals: ProgramGoal[] = goals
    .filter((g) => g.status === "aktif" && roadmapTopics.has(g.topic_id) && g.hedef_soru !== null && g.cozulen_soru < g.hedef_soru)
    .filter((g) => !(g.created_by_role === "ai" && waitsForPlaylist(g.topic_id, g.subject_id)))
    .map((g) => {
      const eff = mastery.get(g.topic_id)?.effective ?? NO_DATA_MASTERY
      const bt = blockTypeFor(eff)
      return {
        assignment_id: g.id,
        topic_id: g.topic_id,
        topic_name: g.topic_name,
        subject_id: g.subject_id,
        subject_name: g.subject_name,
        block_type: bt,
        remaining_questions: (g.hedef_soru ?? 0) - g.cozulen_soru,
        ...learningFlags(g, g.block_type ?? bt, lectureDone),
        son_tarih: g.son_tarih < weekStart ? addDaysIso(weekStart, 6) : g.son_tarih,
        scheduled_blocks: linked.get(g.id) ?? 0,
        priority: roadmapItem.get(g.topic_id)?.priority ?? roadmapItem.get(g.topic_id)?.efficiency ?? 0,
        reason: roadmapItem.get(g.topic_id)?.reasons[0],
        user_goal: g.created_by_role !== "ai",
      }
    })
  for (const q of queued ?? []) {
    const pt = scope[q.topic_id]
    if (!pt || !playlistReached(pt, weekEnd) || !roadmapTopics.has(q.topic_id) || !q.topics || !q.hedef_soru) continue
    if (programGoals.some((g) => g.topic_id === q.topic_id)) continue
    const bt = blockTypeFor(mastery.get(q.topic_id)?.effective ?? NO_DATA_MASTERY)
    programGoals.push({
      assignment_id: q.id,
      topic_id: q.topic_id,
      topic_name: q.topics.name,
      subject_id: q.topics.subject_id,
      subject_name: q.topics.subjects?.name ?? "",
      block_type: bt,
      remaining_questions: q.hedef_soru,
      ...learningFlags({ ...q, cozulen_soru: 0 }, q.block_type ?? bt, lectureDone),
      son_tarih: q.son_tarih < weekStart ? weekEnd : q.son_tarih,
      scheduled_blocks: linked.get(q.id) ?? 0,
      priority: roadmapItem.get(q.topic_id)?.priority ?? 0,
      reason: roadmapItem.get(q.topic_id)?.reasons[0],
    })
  }

  // Sürekli pratik: öğrenme aşaması bekleyen konuya önce konu çalışması (soru
  // hedefi yok), öğrenilmiş konular grup bazında haftalık pratik bloğu alır.
  const practiceGoals = goals.filter((g) => g.status === "aktif" && g.is_practice && roadmapTopics.has(g.topic_id))
  const practiceGroups = new Map<string, PracticeGroupInput>()
  const weekIndex = Math.floor(daysBetweenIso("2024-01-01", weekStart) / 7)
  // Pratik konusunda opsiyonel kısa tekrar yok (pratik bloğu tekrar işlevi görür);
  // zorunlu konu çalışması grup başına haftada bir konuya (konular sırayla öğrenilir).
  const lectureGroup = new Set<string>()
  for (const g of practiceGoals) {
    // Playlist günü bu haftadan sonra gelen pratik konusu bu hafta yok.
    if (scope[g.topic_id] && !playlistReached(scope[g.topic_id], weekEnd)) continue
    if (g.created_by_role === "ai" && waitsForPlaylist(g.topic_id, g.subject_id)) continue
    const flags = { ...learningFlags(g, g.block_type ?? "soru_cozum", lectureDone), short_review_pending: false }
    const groupKey = practiceGroupOf(g.subject_name, g.topic_name)?.key ?? g.id
    if (flags.lecture_pending) {
      if (lectureGroup.has(groupKey)) continue
      lectureGroup.add(groupKey)
      programGoals.push({
        assignment_id: g.id,
        topic_id: g.topic_id,
        topic_name: g.topic_name,
        subject_id: g.subject_id,
        subject_name: g.subject_name,
        block_type: "soru_cozum",
        remaining_questions: 0,
        ...flags,
        son_tarih: addDaysIso(weekStart, 6),
        scheduled_blocks: 0,
      })
      continue
    }
    const def = practiceGroupOf(g.subject_name, g.topic_name)
    if (!def) continue
    const grp = practiceGroups.get(def.key) ?? {
      key: def.key,
      label: def.label,
      subject_id: g.subject_id,
      blocks: def.blocksPerWeek,
      questionsPerBlock: def.questionsPerBlock,
      topics: [],
    }
    grp.topics.push({ assignment_id: g.id, topic_id: g.topic_id, topic_name: g.topic_name })
    practiceGroups.set(def.key, grp)
  }
  for (const grp of practiceGroups.values()) {
    // Bu hafta zaten yerleşmiş pratik blokları düşülür; konular haftadan haftaya döner.
    const ids = new Set(grp.topics.map((t) => t.assignment_id))
    grp.blocks = Math.max(grp.blocks - existingItems.filter((i) => i.assignment_id && ids.has(i.assignment_id)).length, 0)
    const shift = weekIndex % grp.topics.length
    grp.topics = [...grp.topics.slice(shift), ...grp.topics.slice(0, shift)]
  }

  // Tekrarlar: tamamlanan UpPlan hedefleri (aralıklı) + unutulmaya başlayan konular.
  const { data: doneRows } = await admin
    .from("topic_assignments")
    .select("topic_id, updated_at, topics(name, subject_id, subjects(name))")
    .eq("student_id", studentId)
    .eq("status", "tamamlandi")
  const reviewedThisWeek = new Set(existingItems.filter((i) => i.block_type === "tekrar" && i.topic_id).map((i) => i.topic_id!))
  const reviews: ProgramReview[] = []
  const topicMeta = new Map<string, { name: string; subject_id: string; subject_name: string }>()
  for (const d of doneRows ?? []) {
    if (d.topics) topicMeta.set(d.topic_id, { name: d.topics.name, subject_id: d.topics.subject_id, subject_name: d.topics.subjects?.name ?? "" })
  }
  const spaced = spacedReviewsDue(
    (doneRows ?? []).map((d) => ({ topic_id: d.topic_id, completed_on: (d.updated_at ?? "").slice(0, 10) })),
    weekStart,
    SPACED_REVIEW_DAYS,
  )
  for (const s of spaced) {
    const m = topicMeta.get(s.topic_id)
    if (m && !reviewedThisWeek.has(s.topic_id)) reviews.push({ topic_id: s.topic_id, topic_name: m.name, subject_id: m.subject_id, subject_name: m.subject_name, due: s.due, reason: "aralikli" })
  }
  const forgetting = Array.from(mastery.entries()).filter(
    ([id, m]) => m.last && m.effective < m.stored * FORGETTING_REVIEW_RATIO && !reviewedThisWeek.has(id) && !reviews.some((r) => r.topic_id === id) && !programGoals.some((g) => g.topic_id === id),
  )
  if (forgetting.length) {
    const { data: ts } = await admin.from("topics").select("id, name, subject_id, subjects(name)").in("id", forgetting.map(([id]) => id))
    for (const t of ts ?? []) reviews.push({ topic_id: t.id, topic_name: t.name, subject_id: t.subject_id, subject_name: t.subjects?.name ?? "", due: weekStart, reason: "unutma" })
  }

  // Playlist kapsamı: soru blokları ilk videonun plan gününden sonra, başlıkta bağlam.
  const playlistTopics: Record<string, ProgramPlaylistTopic> = {}
  for (const g of programGoals) {
    const pt = scope[g.topic_id]
    if (pt) playlistTopics[g.topic_id] = { notBefore: pt.notBefore, label: playlistShortLabel(pt) }
  }
  const videoDays = await loadVideoDays(admin, studentId, weekStart, existingItems)

  // Track kuralları: okul günleri (tatil hariç), tatil haftası, iskelet, ders payları.
  const pos = schoolPosition(school, weekStart)
  const yearEnd = schoolYearEnd(school.weeks, weekStart)
  const inSchoolYear = (date: string) => school.weeks.length > 0 && date >= school.weeks[0].starts_on && date <= yearEnd && !isBreakDay(school, date)
  const weekdays = [1, 2, 3, 4, 5].filter((d) => inSchoolYear(addDaysIso(weekStart, d - 1)))
  const schoolDays = track === "mezun" ? [] : weekdays
  const holiday = track !== "mezun" && weekdays.length === 0
  const subjects = (subjectRows ?? []).filter((x) => programGoals.some((g) => g.subject_id === x.id) || reviews.some((r) => r.subject_id === x.id))
  const subjectByName = new Map((subjectRows ?? []).map((x) => [x.name, x.id]))
  const examYear = examYearFor({ track, graduation_year: profile.graduation_year, target_exam_year: profile.target_exam_year }, today)
  const contextExam = isYksPoolTrack(track) && isContextBasedExamYear(examYear) && examFor(examCal, "yks", examYear)?.question_style === "baglam_temelli"
  const rules = weekRulesFor({
    track,
    schoolDays,
    holiday,
    skeleton: skeletonFor({
      track,
      alan: profile.alan,
      schoolWeek: pos.week,
      contextExam,
      practice: Array.from(practiceGroups.values()),
      paragrafSubjectId: subjectByName.get("TYT Türkçe") ?? null,
      problemSubjectId: subjectByName.get("TYT Matematik") ?? null,
    }),
    lowValueSubjects: lowValueSubjectIds(subjects, profile.alan, track),
    heavySubjects: heavySubjectIds(subjects),
    coreSubjectId: coreSubjectId(subjectRows ?? [], profile.alan, track),
  })
  const avgEff = new Map<string, number>()
  for (const sub of subjects) {
    const effs = programGoals.filter((g) => g.subject_id === sub.id).map((g) => mastery.get(g.topic_id)?.effective ?? NO_DATA_MASTERY)
    if (effs.length) avgEff.set(sub.id, effs.reduce((a, b) => a + b, 0) / effs.length)
  }
  const puanTuru = profile.alan ? (ALAN_PUAN_TURU[profile.alan] ?? null) : null
  const res = scheduleWeek({
    weekStart,
    today,
    availability: profile.availability,
    focusMinutes: profile.focus_minutes,
    loadFactor: profile.load_factor,
    segment: profile.segment,
    weeksLeft: weeksUntil(today, payload.examDate),
    minutesPerQuestion: mpq,
    goals: programGoals,
    reviews,
    rules,
    // 12 / mezun: ders payı = puan ağırlığı × açık × sıralama baskısı. Maarif: hedef öncelikleri.
    ...(isYksPoolTrack(track) ? { subjectWeights: subjectWeightsFor(subjects, avgEff, puanTuru, profile.target_ranking) } : {}),
    fixed: existingItems
      .filter((i): i is typeof i & { start_time: string; end_time: string } => !!i.start_time && !!i.end_time)
      .map((i) => ({ day_of_week: i.day_of_week, start_time: i.start_time.slice(0, 5), end_time: i.end_time.slice(0, 5) })),
    // Haftada zaten deneme varsa eksik kalanı eklenir; sayaç mevcut + yeni (program sayfasıyla tutarlı).
    existingExams: existingItems.filter((i) => i.block_type === "deneme").length,
    videoDays,
    playlistTopics,
  })
  const items = res.items

  const coached = !!student?.coach_id
  const meta: ProgramDraftMeta = {
    ...res.meta,
    track,
    focusMinutes: profile.focus_minutes,
    ...(opts.replace ? { replaceItemIds: Array.from(replacedIds) } : {}),
  }
  return { items, meta, coached }
}

type AssignmentGoal = Awaited<ReturnType<typeof loadAssignmentsWithProgress>>[number]

/**
 * Önizleme hedefleri: yol haritasının "aktif" kalemleri onaylanmış gibi (UpPlan
 * hedefi), mevcut öğrenci/koç hedefleri korunur.
 */
export function previewGoals(payload: RoadmapPayload, current: AssignmentGoal[], weekStart: string): AssignmentGoal[] {
  const studentId = current[0]?.student_id ?? ""
  const human = current.filter((g) => g.status === "aktif" && g.created_by_role !== "ai")
  const humanTopics = new Set(human.map((g) => g.topic_id))
  const fromRoadmap = payload.items
    .filter((i) => i.status === "aktif" && !humanTopics.has(i.topic_id))
    .map(
      (i): AssignmentGoal => ({
        id: `onizleme:${i.topic_id}`,
        student_id: studentId,
        coach_id: null,
        hedef_dogruluk: i.target_accuracy,
        hedef_sure_dk: null,
        baslangic_tarihi: i.start,
        notes: i.reasons[0] ?? null,
        plan_order: i.plan_order,
        dogru_sayisi: 0,
        toplam_sure_dk: 0,
        topic_id: i.topic_id,
        topic_name: i.topic_name,
        subject_id: i.subject_id,
        subject_name: i.subject_name,
        status: "aktif",
        created_by_role: "ai",
        hedef_soru: i.practice ? null : i.target_questions,
        cozulen_soru: 0,
        son_tarih: i.end < weekStart ? addDaysIso(weekStart, 6) : i.end,
        block_type: i.block_type,
        learning_phase: i.learning_phase ?? null,
        learned_at: null,
        is_practice: !!i.practice,
      }),
    )
  return [...human, ...fromRoadmap]
}

/**
 * Taslağı programa yazar. `writer` öğrenci onayında service role (created_by_role='ai'),
 * koç kabulünde koçun oturum client'ı (trigger 'coach' yazar).
 */
export async function applyProgramDraft(
  admin: Client,
  writer: Client,
  studentId: string,
  weekStart: string,
  decidedBy: string,
  pick?: number[],
): Promise<{ error?: string; count?: number; replaced?: number }> {
  const { data: draft } = await admin
    .from("upplan_program_drafts")
    .select("items, status, meta")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle()
  if (!draft || (draft.status !== "taslak" && draft.status !== "koca_onerildi")) return { error: "Onaylanacak taslak yok." }
  const all = parseDraftItems(draft.items)
  const items = pick ? all.filter((_, i) => pick.includes(i)) : all
  const replaceIds = ((draft.meta ?? {}) as ProgramDraftMeta).replaceItemIds ?? []
  if (items.length === 0 && replaceIds.length === 0) return { error: "Seçili kalem yok." }

  const prog = await ensureProgram(writer, studentId, weekStart, decidedBy)
  if ("error" in prog) return { error: prog.error }
  if (items.length) {
    const { data: last } = await writer
      .from("weekly_program_items")
      .select("order_index")
      .eq("program_id", prog.id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle()
    let order = (last?.order_index ?? 0) + 1
    const writerIsAdmin = writer === admin
    const { error } = await writer.from("weekly_program_items").insert(
      items.map((i) => ({
        program_id: prog.id,
        day_of_week: i.day_of_week,
        start_time: i.start_time,
        end_time: i.end_time,
        subject_id: i.subject_id,
        topic_id: i.topic_id,
        assignment_id: i.assignment_id,
        block_type: i.block_type,
        baslik: i.baslik.slice(0, 120),
        hedef_soru: i.hedef_soru,
        // "Neden bu blok?" programda açıklama olarak görünür.
        aciklama: i.neden ? i.neden.slice(0, 300) : "UpPlan",
        order_index: order++,
        ...(writerIsAdmin ? { created_by_role: "ai" } : {}),
      })),
    )
    if (error) {
      console.error("applyProgramDraft", error)
      return { error: "Program yazılamadı." }
    }
  }
  // Yeniden oluşturma: yeni kalemler yazıldıktan sonra taslaktaki eski UpPlan
  // kalemleri silinir — yalnız hâlâ UpPlan'ın, tamamlanmamış ve bugün/sonrasındaysa
  // (bu arada tamamlanan ya da elle düzenlenen korunur).
  let replaced = 0
  if (replaceIds.length) {
    const { data: cur } = await admin
      .from("weekly_program_items")
      .select("id, day_of_week, created_by_role, is_completed")
      .eq("program_id", prog.id)
      .in("id", replaceIds)
    const ids = replaceableItems(cur ?? [], weekStart, istanbulDateStr()).map((i) => i.id)
    if (ids.length) {
      const { error: de } = await admin.from("weekly_program_items").delete().in("id", ids).eq("program_id", prog.id)
      if (de) {
        console.error("applyProgramDraft replace", de)
        return { error: "Yeni bloklar eklendi ama eski UpPlan blokları kaldırılamadı; tekrar dene." }
      }
      replaced = ids.length
    }
  }
  await admin
    .from("upplan_program_drafts")
    .update({ status: "onaylandi", decided_at: new Date().toISOString(), decided_by: decidedBy })
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
  return { count: items.length, replaced }
}

