import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { InsightTarget } from "@/lib/insights"

// Analizim bölüm kabuğu + ortak bağlam. Her bölüm async server component;
// veri hatası kendi kartında gösterilir, diğer bölümler etkilenmez.

export type AnalizMode = "student" | "coach"

export type AnalizCtx = {
  studentId: string
  from: string | null
  to: string
  days: number | null
  label: string
  subjectId: string | null
  split: string
  mode: AnalizMode
  /** Bu sayfanın yolu (ders detayı linkleri için). */
  basePath: string
  /** Mevcut filtre query string'i (detay=… hariç). */
  query: string
  /** Seçili detay dersi (Bölüm C). */
  detailSubjectId: string | null
}

const STUDENT_LINKS: Record<InsightTarget, string> = {
  "soru-cozum": "/ogrenci/soru-cozum",
  kaynaklar: "/ogrenci/kaynaklarim",
  denemeler: "/ogrenci/denemelerim",
  program: "/ogrenci/program",
  "yanlis-defteri": "/ogrenci/yanlis-defteri",
  konular: "/ogrenci/konularim",
}

const COACH_LINKS: Record<InsightTarget, string> = {
  "soru-cozum": "soru-cozum",
  kaynaklar: "kaynaklar",
  denemeler: "denemeler",
  program: "program",
  "yanlis-defteri": "acik-haritasi",
  konular: "konular",
}

export function linkFor(ctx: AnalizCtx, target: InsightTarget): string {
  return ctx.mode === "student" ? STUDENT_LINKS[target] : `/koc/ogrenciler/${ctx.studentId}/${COACH_LINKS[target]}`
}

export function SectionCard({
  id,
  title,
  icon,
  description,
  action,
  children,
}: {
  id?: string
  title: string
  icon?: ReactNode
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            {icon}
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 ${className ?? ""}`}>
      {title && <h3 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h3>}
      {children}
    </div>
  )
}

export function NotEnough({ children }: { children: ReactNode }) {
  return <div className="flex min-h-24 items-center justify-center px-4 py-6 text-center text-sm text-zinc-500">{children}</div>
}

export function SectionSkeleton({ title, rows = 2 }: { title: string; rows?: number }) {
  return (
    <section className="space-y-3" aria-busy="true" aria-label={`${title} yükleniyor`}>
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}

export function SectionError({ title }: { title: string }) {
  return (
    <section className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {title} yüklenemedi. Sayfayı yenileyip tekrar deneyin.
    </section>
  )
}

/** Başarı rengi: <%50 kırmızı, %50–70 sarı, >%70 yeşil. */
export function successTone(pct: number | null): string {
  if (pct === null) return "text-zinc-400"
  if (pct < 50) return "bg-red-50 text-red-700"
  if (pct <= 70) return "bg-amber-50 text-amber-700"
  return "bg-emerald-50 text-emerald-700"
}

export const pct = (a: number, b: number): number | null => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} dk`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} sa ${m} dk` : `${h} sa`
}

/** Bölüm verisini yükler; hata olursa loglar ve null döner (bölüm hata kartı gösterir). */
export async function safeLoad<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    console.error(label, e)
    return null
  }
}
