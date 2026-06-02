import Link from "next/link"
import { BookOpen, ExternalLink } from "lucide-react"
import { EmptyChartCard } from "./empty-state"

type Row = {
  slug: string | null
  title: string | null
  views: number
  uniques: number
}

export function TopBlogTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
        En Çok Okunan Blog Yazıları
      </h2>
      <p className="text-xs text-zinc-500 mb-4">İlk {Math.min(rows.length, 10)}</p>

      {rows.length === 0 ? (
        <EmptyChartCard label="Bu dönemde blog yazısı görüntülenmedi" />
      ) : (
        <ul className="space-y-2">
          {rows.map((r, idx) => {
            const href = r.slug ? `/blog/${r.slug}` : null
            return (
              <li
                key={r.slug ?? `unknown-${idx}`}
                className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-b-0"
              >
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[#F97316]" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  {href ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-900 hover:text-[#1B6B8A] inline-flex items-start gap-1.5 group leading-snug"
                    >
                      <span className="line-clamp-2">
                        {r.title ?? r.slug ?? "Bilinmeyen yazı"}
                      </span>
                      <ExternalLink
                        className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-zinc-900 leading-snug">
                      Bilinmeyen yazı
                    </span>
                  )}
                  {r.slug && (
                    <div className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                      /blog/{r.slug}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-zinc-900 tabular-nums">
                    {r.views.toLocaleString("tr-TR")}
                  </div>
                  <div className="text-[11px] text-zinc-500 tabular-nums">
                    {r.uniques.toLocaleString("tr-TR")} tekil
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
