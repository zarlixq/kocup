import type { ScoreMetric } from "@/lib/analytics/scoreboard"
import { DEFAULT_SCORE_METRIC, DEFAULT_MULTIPLIER_ON } from "@/lib/analytics/scoreboard"

// ─────────────────────────────────────────────────────────────────────────
// user_ui_preferences — CLIENT-SAFE tipler + varsayılanlar + birleştirme
// ─────────────────────────────────────────────────────────────────────────
// Bu dosya server importu İÇERMEZ → hem client hem server component'ler
// güvenle import edebilir. Server okuma/yazma: ui-preferences-actions.ts.
// ─────────────────────────────────────────────────────────────────────────

export type UiScope =
  | "mudur_dashboard"
  | "mudur_student_list"
  | "koc_student_list"
  | "kurum_dashboard"
  | "mudur_individual_list"

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

// ── Müdür bireysel öğrenci listesi: kolon görünürlüğü + kalıcı filtreler ─
export type IndividualListColumns = {
  created: boolean
  source: boolean
  utm: boolean
  segment: boolean
  verified: boolean
  setup: boolean
  lastLogin: boolean
  sessions7d: boolean
  compliance: boolean
}

export type IndividualListPrefs = {
  columns: IndividualListColumns
  filters: {
    source: string
    utm: string
    from: string
    to: string
    setup: string
    activity: string
  }
}

export const INDIVIDUAL_LIST_DEFAULTS: IndividualListPrefs = {
  columns: {
    created: true,
    source: true,
    utm: true,
    segment: true,
    verified: true,
    setup: true,
    lastLogin: true,
    sessions7d: true,
    compliance: true,
  },
  filters: { source: "__all__", utm: "__all__", from: "", to: "", setup: "__all__", activity: "__all__" },
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

export function mergeIndividualListPrefs(raw: unknown): IndividualListPrefs {
  const d = INDIVIDUAL_LIST_DEFAULTS
  if (!isObj(raw)) return d
  const cols = isObj(raw.columns) ? raw.columns : {}
  const f = isObj(raw.filters) ? raw.filters : {}
  const oneOf = (v: unknown, list: string[], fb: string) => (typeof v === "string" && list.includes(v) ? v : fb)
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "")
  const columns = Object.fromEntries(
    (Object.keys(d.columns) as (keyof IndividualListColumns)[]).map((k) => [k, boolOr(cols[k], d.columns[k])]),
  ) as IndividualListColumns
  return {
    columns,
    filters: {
      source: oneOf(f.source, ["__all__", "ucretsiz_kayit", "davet", "diger"], "__all__"),
      utm: typeof f.utm === "string" && f.utm.length <= 100 ? f.utm : "__all__",
      from: date(f.from),
      to: date(f.to),
      setup: oneOf(f.setup, ["__all__", "tamam", "eksik"], "__all__"),
      activity: oneOf(f.activity, ["__all__", "aktif", "pasif"], "__all__"),
    },
  }
}

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback
}
