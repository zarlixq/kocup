import { List } from "lucide-react"
import type { HeadingItem } from "@/lib/blog/headings"

type TocProps = {
  headings: HeadingItem[]
}

export function TableOfContents({ headings }: TocProps) {
  if (headings.length < 2) return null

  return (
    <nav
      aria-label="İçindekiler"
      className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 md:p-6"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
          <List className="w-4 h-4 text-[#F97316]" aria-hidden />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
          İçindekiler
        </h2>
      </div>
      <ol className="space-y-2 list-none m-0 p-0">
        {headings.map((h, i) => (
          <li key={h.id} className="m-0 p-0 leading-snug">
            <a
              href={`#${h.id}`}
              className="group flex items-baseline gap-3 text-sm text-zinc-600 hover:text-[#1B6B8A] transition-colors"
            >
              <span className="text-[11px] font-bold tabular-nums text-zinc-400 group-hover:text-[#F97316] transition-colors min-w-[1.5rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-medium underline-offset-4 group-hover:underline">
                {h.text}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
