import type { Track } from "@/lib/upplan/track"

// Panel turu (spotlight) — rol + track bazlı adımlar ve kalıcı durum (client-safe).
// Durum user_ui_preferences scope='onboarding' (lib/onboarding/actions.ts).
// Adımların hedefi sidebar bağlantıları ([data-tour="nav:/ogrenci/..."]) ve sayfa
// öğeleri; mobilde görünmeyen hedefte adım ekran ortasında açılır.

export const TOUR_ROLES = ["student", "coach", "admin", "org_admin"] as const
export type TourRole = (typeof TOUR_ROLES)[number]

/** Adım metinleri değişince artır: eski sürümü bitirenlere yeni tur bir kez daha açılır. */
export const TOUR_VERSION = 1

export type TourStatus = "yeni" | "devam" | "atlandi" | "bitti"
export type TourState = { status: TourStatus; step: number; version: number }
export type OnboardingPrefs = {
  tours: Partial<Record<TourRole, TourState>>
  /** Kurulum listesinin "Konularım'ı gözden geçir" adımı. */
  visitedKonularim: boolean
}

export const ONBOARDING_DEFAULTS: OnboardingPrefs = { tours: {}, visitedKonularim: false }

const isStatus = (v: unknown): v is TourStatus => v === "yeni" || v === "devam" || v === "atlandi" || v === "bitti"

export function mergeOnboardingPrefs(raw: unknown): OnboardingPrefs {
  if (!raw || typeof raw !== "object") return ONBOARDING_DEFAULTS
  const r = raw as { tours?: Record<string, unknown>; visitedKonularim?: unknown }
  const tours: OnboardingPrefs["tours"] = {}
  for (const role of TOUR_ROLES) {
    const t = r.tours?.[role] as Partial<TourState> | undefined
    if (t && isStatus(t.status)) {
      tours[role] = { status: t.status, step: Number.isInteger(t.step) ? (t.step as number) : 0, version: Number(t.version) || 0 }
    }
  }
  return { tours, visitedKonularim: r.visitedKonularim === true }
}

/** Tur kendiliğinden açılsın mı: hiç görülmedi, yarıda kaldı ya da sürüm yenilendi. */
export function shouldAutoStart(state: TourState | undefined): boolean {
  if (!state) return true
  if (state.version < TOUR_VERSION) return true
  return state.status === "yeni" || state.status === "devam"
}

export type TourStep = {
  /** CSS seçici; yoksa ekran ortasında. */
  element?: string
  title: string
  description: string
}

const nav = (href: string) => `[data-tour="nav:${href}"]`
const HELP: TourStep = {
  element: '[data-tour="tour-help"]',
  title: "Yardım",
  description: "Turu istediğin zaman buradan yeniden başlatabilirsin.",
}

function studentSteps(track: Track | null): TourStep[] {
  const early = track === "maarif_9" || track === "maarif_10"
  const eleven = track === "maarif_11"
  const lgs = track === "lgs"
  const intro = early
    ? "Programın okulda işlediğin konulara göre kurulur: işlenenleri pekiştirir, bir iki hafta önden gidersin."
    : eleven
      ? "Programın hem okul derslerini takip eder hem de seni YKS 2028'e hazırlar (yeni, bağlam temelli soru tipi dahil)."
      : lgs
        ? "Programın LGS konularına göre kurulur."
        : "Programın TYT/AYT konularının sınav değerine, ustalığına ve müsaitliğine göre kurulur."
  return [
    { title: "KoçUp'a hoş geldin", description: `${intro} Kısa bir tur yapalım.` },
    {
      element: '[data-tour="setup-checklist"]',
      title: "Kurulum listesi",
      description: "Buradaki adımları bitirince programın hazır olur; liste tamamlanınca kaybolur.",
    },
    {
      element: nav("/ogrenci/upplan"),
      title: "UpPlan",
      description: "Konu konu ustalık haritan. Soru, deneme ve konu öz değerlendirmen girdikçe güncellenir.",
    },
    {
      element: nav("/ogrenci/konularim"),
      title: "Konularım ve yol haritası",
      description: early
        ? "Okulda işlediğin ve yakında işleyeceğin konular hafta hafta. Yol haritanı buradan onaylarsın."
        : "Hangi konuyu ne zaman çalışacağın, getirisine göre sıralı. Onayladığın yol haritasından program üretilir.",
    },
    {
      element: nav("/ogrenci/program"),
      title: "Haftalık program",
      description: "Her blokta 'neden bu blok?' açıklaması var. Uymayan bloğu 'Değiştir' ile neden seçerek değiştirirsin.",
    },
    {
      element: nav("/ogrenci/soru-cozum"),
      title: "Soru çözümü kaydı",
      description: "Çözdüğün soruları gir: ustalığın ve programın buna göre güncellenir.",
    },
    early
      ? {
          element: nav("/ogrenci/yanlis-defteri"),
          title: "Yanlış defteri",
          description: "Yazılılara hazırlanırken yanlışlarını buraya ekle; tekrar blokları bunlardan gelir.",
        }
      : {
          element: nav("/ogrenci/denemelerim"),
          title: "Denemelerin",
          description: "Denemeni gir; ertesi gün programında deneme analizi bloğu olur, zayıf konular önceliğe girer.",
        },
    HELP,
  ]
}

const COACH_STEPS: TourStep[] = [
  { title: "Koç paneline hoş geldin", description: "Öğrencilerinin programlarını UpPlan önerileri üzerinden yönetirsin. Kısa bir tur." },
  {
    element: nav("/koc/ogrenciler"),
    title: "Öğrencilerin",
    description: "Her öğrencinin UpPlan sekmesinde yol haritası ve haftalık program önerilerini görür, kabul edersin.",
  },
  { element: nav("/koc/randevular"), title: "Randevular", description: "Görüşmelerini buradan planlarsın." },
  { element: nav("/koc/araclar"), title: "Araçlar", description: "Program şablonları ve yardımcı araçlar." },
  HELP,
]

const ADMIN_STEPS: TourStep[] = [
  { title: "Müdür paneline hoş geldin", description: "Platformun tamamını yönettiğin panel. Kısa bir tur." },
  { element: nav("/mudur/talepler"), title: "Başvurular", description: "Kurum, koç ve öğrenci başvuruları burada." },
  { element: nav("/mudur/ogrenciler"), title: "Öğrenciler", description: "Bütün öğrenciler; koç ataması ve durumları." },
  { element: nav("/mudur/koclar"), title: "Koçlar", description: "Koç kadrosu ve performansı." },
  {
    element: nav("/mudur/upplan"),
    title: "UpPlan izleme",
    description: "Öğrenci seçip track, konu havuzu ve üretilen planı inceler; track bazlı kabul/uyum metriklerini görürsün.",
  },
  HELP,
]

const ORG_STEPS: TourStep[] = [
  { title: "Kurum paneline hoş geldin", description: "Kurumundaki koç ve öğrencileri izlediğin panel. Kısa bir tur." },
  { element: nav("/kurum/ogrenciler"), title: "Öğrenciler", description: "Kurumundaki öğrenciler ve programlarına uyumları." },
  { element: nav("/kurum/koclar"), title: "Koçlar", description: "Koçlarının aktifliği ve öğrencileri." },
  { element: nav("/kurum/analitik"), title: "Analitik", description: "Koç aktifliği ve haftalık program uyumu." },
  { element: nav("/kurum/davetler"), title: "Davetler", description: "Yeni koç ve öğrenci davet et." },
  HELP,
]

export function tourSteps(role: TourRole, track: Track | null): TourStep[] {
  if (role === "student") return studentSteps(track)
  if (role === "coach") return COACH_STEPS
  if (role === "admin") return ADMIN_STEPS
  return ORG_STEPS
}
