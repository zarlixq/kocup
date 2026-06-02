// =====================================================
// KoçUp — Araçlar konfigürasyonu
// ÖSYM / MEB kuralları değişirse SADECE bu dosyayı güncelle.
// =====================================================

// ---------------------------------------------------
// Net hesaplama: penaltı katsayısı
// YKS (TYT/AYT) → 4 yanlış 1 doğruyu götürür
// LGS → 3 yanlış 1 doğruyu götürür
// ---------------------------------------------------
export const PENALTY_DIVISOR = {
  yks: 4,
  lgs: 3,
} as const

export type ExamFamily = keyof typeof PENALTY_DIVISOR

// ---------------------------------------------------
// Soru sayıları
// ---------------------------------------------------
export type Subject = { key: string; label: string; count: number }

export const TYT_SUBJECTS: Subject[] = [
  { key: "tyt-turkce", label: "Türkçe", count: 40 },
  { key: "tyt-sosyal", label: "Sosyal Bilimler", count: 20 },
  { key: "tyt-matematik", label: "Matematik", count: 40 },
  { key: "tyt-fen", label: "Fen Bilimleri", count: 20 },
]

export type AytFieldKey = "sayisal" | "esitagirlik" | "sozel"
export type AytField = {
  key: AytFieldKey
  label: string
  subjects: Subject[]
}

export const AYT_FIELDS: AytField[] = [
  {
    key: "sayisal",
    label: "Sayısal",
    subjects: [
      { key: "ayt-sa-matematik", label: "Matematik", count: 40 },
      { key: "ayt-sa-fizik", label: "Fizik", count: 14 },
      { key: "ayt-sa-kimya", label: "Kimya", count: 13 },
      { key: "ayt-sa-biyoloji", label: "Biyoloji", count: 13 },
    ],
  },
  {
    key: "esitagirlik",
    label: "Eşit Ağırlık",
    subjects: [
      { key: "ayt-ea-matematik", label: "Matematik", count: 40 },
      { key: "ayt-ea-edebiyat", label: "Türk Dili ve Edebiyatı", count: 24 },
      { key: "ayt-ea-tarih1", label: "Tarih-1", count: 10 },
      { key: "ayt-ea-cografya1", label: "Coğrafya-1", count: 6 },
    ],
  },
  {
    key: "sozel",
    label: "Sözel",
    subjects: [
      { key: "ayt-so-edebiyat", label: "Türk Dili ve Edebiyatı", count: 24 },
      { key: "ayt-so-tarih1", label: "Tarih-1", count: 10 },
      { key: "ayt-so-cografya1", label: "Coğrafya-1", count: 6 },
      { key: "ayt-so-tarih2", label: "Tarih-2", count: 11 },
      { key: "ayt-so-cografya2", label: "Coğrafya-2", count: 11 },
      { key: "ayt-so-felsefe", label: "Felsefe Grubu", count: 12 },
      { key: "ayt-so-din", label: "Din Kültürü", count: 6 },
    ],
  },
]

export type LgsSessionKey = "sozel" | "sayisal"
export type LgsSession = { key: LgsSessionKey; label: string; subjects: Subject[] }

export const LGS_SESSIONS: LgsSession[] = [
  {
    key: "sozel",
    label: "Sözel Bölüm",
    subjects: [
      { key: "lgs-so-turkce", label: "Türkçe", count: 20 },
      { key: "lgs-so-sosyal", label: "T.C. İnkılap Tarihi", count: 10 },
      { key: "lgs-so-din", label: "Din Kültürü", count: 10 },
      { key: "lgs-so-ingilizce", label: "Yabancı Dil", count: 10 },
    ],
  },
  {
    key: "sayisal",
    label: "Sayısal Bölüm",
    subjects: [
      { key: "lgs-sa-matematik", label: "Matematik", count: 20 },
      { key: "lgs-sa-fen", label: "Fen Bilimleri", count: 20 },
    ],
  },
]

// ---------------------------------------------------
// Sınav tarihleri
// ---------------------------------------------------
// TODO: ÖSYM ve MEB resmi sınav takvimini açıkladığında bu tarihleri
// güncelle. Onaylanan tarih için `confirmed: true` yap.
// Placeholder tarihler arayüzde "tahmini" rozetiyle gösterilir.
// ---------------------------------------------------
export type ExamDate = {
  key: string
  family: ExamFamily
  label: string
  /** ISO 8601 — Europe/Istanbul */
  startsAt: string
  /** Resmi takvim onaylandı mı? */
  confirmed: boolean
  description?: string
}

export const EXAM_DATES: { yks: ExamDate[]; lgs: ExamDate[] } = {
  yks: [
    // TODO: ÖSYM 2026 YKS takvimi açıklandığında onayla
    {
      key: "yks-2026-tyt",
      family: "yks",
      label: "TYT 2026",
      startsAt: "2026-06-20T10:15:00+03:00",
      confirmed: false,
      description: "Temel Yeterlilik Testi",
    },
    {
      key: "yks-2026-ayt",
      family: "yks",
      label: "AYT 2026",
      startsAt: "2026-06-21T10:15:00+03:00",
      confirmed: false,
      description: "Alan Yeterlilik Testi",
    },
    // TODO: ÖSYM 2027 YKS takvimini açıkladığında güncelle
    {
      key: "yks-2027-tyt",
      family: "yks",
      label: "TYT 2027",
      startsAt: "2027-06-19T10:15:00+03:00",
      confirmed: false,
      description: "Temel Yeterlilik Testi",
    },
    {
      key: "yks-2027-ayt",
      family: "yks",
      label: "AYT 2027",
      startsAt: "2027-06-20T10:15:00+03:00",
      confirmed: false,
      description: "Alan Yeterlilik Testi",
    },
  ],
  lgs: [
    // TODO: MEB 2026 LGS takvimi açıklandığında onayla
    {
      key: "lgs-2026",
      family: "lgs",
      label: "LGS 2026",
      startsAt: "2026-06-07T09:30:00+03:00",
      confirmed: false,
      description: "Liselere Geçiş Sınavı",
    },
    // TODO: MEB 2027 LGS takvimini açıkladığında güncelle
    {
      key: "lgs-2027",
      family: "lgs",
      label: "LGS 2027",
      startsAt: "2027-06-06T09:30:00+03:00",
      confirmed: false,
      description: "Liselere Geçiş Sınavı",
    },
  ],
}

// ---------------------------------------------------
// Net formülü
// ---------------------------------------------------
export function calcNet({
  correct,
  wrong,
  exam,
}: {
  correct: number
  wrong: number
  exam: ExamFamily
}): number {
  const k = PENALTY_DIVISOR[exam]
  const net = correct - wrong / k
  return Math.max(0, Math.round(net * 100) / 100)
}

// ---------------------------------------------------
// Araç manifestosu
// ---------------------------------------------------
export type ToolIcon = "calculator" | "timer-reset" | "alarm-clock" | "compass"

export type ToolMeta = {
  slug: string
  title: string
  shortTitle: string
  description: string
  longDescription: string
  iconKey: ToolIcon
  publicPath: string
  panelHash: string
  relatedBlogSlug?: string
  relatedBlogTitle?: string
  keywords: string
}

export const TOOLS: ToolMeta[] = [
  {
    slug: "net-hesaplama",
    title: "Net Hesaplama (TYT, AYT, LGS)",
    shortTitle: "Net Hesaplama",
    description: "TYT, AYT ve LGS netlerini saniyeler içinde hesapla.",
    longDescription:
      "Doğru ve yanlış sayılarını gir, ders başına net ve toplam net hesabını anında gör. YKS için 4 yanlış 1 doğru, LGS için 3 yanlış 1 doğru kuralı uygulanır.",
    iconKey: "calculator",
    publicPath: "/araclar/net-hesaplama",
    panelHash: "net-hesaplama",
    relatedBlogSlug: "deneme-analizi-nasil-yapilir",
    relatedBlogTitle: "Deneme Analizi Nasıl Yapılır? Net'i Artıran Yöntem",
    keywords:
      "tyt net hesaplama, ayt net hesaplama, lgs net hesaplama, deneme net hesaplayıcı",
  },
  {
    slug: "geri-sayim",
    title: "YKS & LGS Geri Sayım",
    shortTitle: "Geri Sayım",
    description: "Sınava kaç gün, saat, dakika kaldığını canlı izle.",
    longDescription:
      "TYT, AYT ve LGS için canlı geri sayım sayacı. Hedef sınav tarihlerine kalan süreyi gün, saat, dakika ve saniye olarak gösterir.",
    iconKey: "alarm-clock",
    publicPath: "/araclar/geri-sayim",
    panelHash: "geri-sayim",
    relatedBlogSlug: "yks-yol-haritasi-2026",
    relatedBlogTitle: "YKS'ye Nasıl Hazırlanılır? 2026 Yol Haritası",
    keywords: "yks geri sayım, lgs geri sayım, sınav sayacı, kaç gün kaldı",
  },
  {
    slug: "pomodoro",
    title: "Pomodoro Çalışma Zamanlayıcısı",
    shortTitle: "Pomodoro",
    description: "25 dakika odak, 5 dakika mola — kanıtlanmış verim tekniği.",
    longDescription:
      "Pomodoro tekniğiyle 25 dakikalık odak blokları arasında kısa molalar verirsin. Telefon dikkat dağıtmadan ders veriminin en pratik yolu.",
    iconKey: "timer-reset",
    publicPath: "/araclar/pomodoro",
    panelHash: "pomodoro",
    relatedBlogSlug: "verimli-calisma-teknikleri-pomodoro-ve-otesi",
    relatedBlogTitle: "Verimli Çalışma Teknikleri: Pomodoro ve Ötesi",
    keywords: "pomodoro tekniği, odak sayacı, ders çalışma zamanlayıcı, focus timer",
  },
  {
    slug: "tercih-rehberi",
    title: "Tercih Rehberi (YÖK Atlas)",
    shortTitle: "Tercih Rehberi",
    description: "YÖK Atlas'ı doğru kullanmanın adım adım rehberi.",
    longDescription:
      "YÖK Atlas üzerinden geçen yıl taban puan, başarı sıralaması ve kontenjan verilerine nasıl bakılır? Yanlış tercihten kaçınmak için adım adım rehber + resmi YÖK Atlas yönlendirmesi.",
    iconKey: "compass",
    publicPath: "/araclar/tercih-rehberi",
    panelHash: "tercih-rehberi",
    relatedBlogSlug: "yks-yol-haritasi-2026",
    relatedBlogTitle: "YKS'ye Nasıl Hazırlanılır? 2026 Yol Haritası",
    keywords: "yök atlas, taban puan, başarı sıralaması, üniversite tercihi rehberi",
  },
]

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug)
}
