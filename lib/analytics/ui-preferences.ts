import type { ScoreMetric } from "@/lib/analytics/scoreboard"
import { DEFAULT_SCORE_METRIC, DEFAULT_MULTIPLIER_ON } from "@/lib/analytics/scoreboard"

// ─────────────────────────────────────────────────────────────────────────
// user_ui_preferences — CLIENT-SAFE tipler + varsayılanlar + birleştirme
// ─────────────────────────────────────────────────────────────────────────
// Bu dosya server importu İÇERMEZ → hem client hem server component'ler
// güvenle import edebilir. Server okuma/yazma: ui-preferences-actions.ts.
// ─────────────────────────────────────────────────────────────────────────

export type UiScope = "mudur_dashboard" | "mudur_student_list" | "koc_student_list"

// ── Müdür dashboard: leaderboard görünürlük/sıralama tercihleri ──────────
export type DashboardColumns = {
  questions: boolean
  net: boolean
  activity: boolean
  compliance: boolean
}

export type DashboardPrefs = {
  metric: ScoreMetric
  multiplierOn: boolean
  topN: number
  columns: DashboardColumns
}

export const DASHBOARD_DEFAULTS: DashboardPrefs = {
  metric: DEFAULT_SCORE_METRIC,
  multiplierOn: DEFAULT_MULTIPLIER_ON,
  topN: 10,
  columns: { questions: true, net: true, activity: true, compliance: true },
}

// ── Müdür öğrenci listesi: kolon görünürlüğü + kalıcı durum filtresi ─────
export type StudentListColumns = {
  grade: boolean
  coach: boolean
  compliance: boolean
  target: boolean
  parentPhone: boolean
  created: boolean
}

export type StudentListPrefs = {
  columns: StudentListColumns
  statusFilter: string // "__all__" | "pending" | "active" | "passive"
}

export const STUDENT_LIST_DEFAULTS: StudentListPrefs = {
  columns: {
    grade: true,
    coach: true,
    compliance: true,
    target: true,
    parentPhone: true,
    created: true,
  },
  statusFilter: "active",
}

// ── Güvenli birleştirme: eksik/yeni alanları varsayılandan doldur ────────
// jsonb şema evrimine dayanıklı — DB'de eski/eksik anahtar olsa da UI kırılmaz.
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function mergeDashboardPrefs(raw: unknown): DashboardPrefs {
  if (!isObj(raw)) return DASHBOARD_DEFAULTS
  const cols = isObj(raw.columns) ? raw.columns : {}
  const metric = raw.metric
  return {
    metric:
      metric === "questions" || metric === "net" || metric === "activity"
        ? metric
        : DASHBOARD_DEFAULTS.metric,
    multiplierOn:
      typeof raw.multiplierOn === "boolean" ? raw.multiplierOn : DASHBOARD_DEFAULTS.multiplierOn,
    topN:
      typeof raw.topN === "number" && raw.topN > 0 && raw.topN <= 100
        ? Math.floor(raw.topN)
        : DASHBOARD_DEFAULTS.topN,
    columns: {
      questions: boolOr(cols.questions, DASHBOARD_DEFAULTS.columns.questions),
      net: boolOr(cols.net, DASHBOARD_DEFAULTS.columns.net),
      activity: boolOr(cols.activity, DASHBOARD_DEFAULTS.columns.activity),
      compliance: boolOr(cols.compliance, DASHBOARD_DEFAULTS.columns.compliance),
    },
  }
}

export function mergeStudentListPrefs(raw: unknown): StudentListPrefs {
  if (!isObj(raw)) return STUDENT_LIST_DEFAULTS
  const cols = isObj(raw.columns) ? raw.columns : {}
  const sf = raw.statusFilter
  return {
    columns: {
      grade: boolOr(cols.grade, STUDENT_LIST_DEFAULTS.columns.grade),
      coach: boolOr(cols.coach, STUDENT_LIST_DEFAULTS.columns.coach),
      compliance: boolOr(cols.compliance, STUDENT_LIST_DEFAULTS.columns.compliance),
      target: boolOr(cols.target, STUDENT_LIST_DEFAULTS.columns.target),
      parentPhone: boolOr(cols.parentPhone, STUDENT_LIST_DEFAULTS.columns.parentPhone),
      created: boolOr(cols.created, STUDENT_LIST_DEFAULTS.columns.created),
    },
    statusFilter:
      sf === "__all__" || sf === "pending" || sf === "active" || sf === "passive"
        ? sf
        : STUDENT_LIST_DEFAULTS.statusFilter,
  }
}

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback
}
