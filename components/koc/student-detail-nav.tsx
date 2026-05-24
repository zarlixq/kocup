"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function StudentDetailNav({ studentId }: { studentId: string }) {
  const pathname = usePathname()
  const base = `/koc/ogrenciler/${studentId}`

  const tabs = [
    { href: base, label: "Genel Bakış", exact: true },
    { href: `${base}/konular`, label: "Konular" },
    { href: `${base}/program`, label: "Program" },
    { href: `${base}/denemeler`, label: "Denemeler" },
    { href: `${base}/soru-cozum`, label: "Soru Çözüm" },
    { href: `${base}/odemeler`, label: "Ödemeler" },
  ]

  return (
    <nav className="flex flex-wrap gap-1 border-b border-zinc-200">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/")
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-[#1B6B8A] text-[#1B6B8A]"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
