"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = {
  /** Hangi sayfada olduğunu bildiren temel URL. */
  baseHref: string
  current: number
}

const TERMS = [
  { value: 1, label: "1. Dönem" },
  { value: 2, label: "2. Dönem" },
]

export function ProgramTermSwitch({ baseHref, current }: Props) {
  return (
    <div className="inline-flex rounded-full bg-zinc-100 p-0.5">
      {TERMS.map((t) => {
        const isActive = current === t.value
        const href = t.value === 1 ? baseHref : `${baseHref}?donem=2`
        return (
          <Link
            key={t.value}
            href={href}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
              isActive
                ? "bg-white text-[#1B6B8A] shadow-sm"
                : "text-zinc-600 hover:text-zinc-900",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
