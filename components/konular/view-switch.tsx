"use client"

import Link from "next/link"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  baseHref: string
  view: "kanban" | "liste"
}

export function KonularViewSwitch({ baseHref, view }: Props) {
  return (
    <div className="inline-flex rounded-full bg-zinc-100 p-0.5">
      <Link
        href={baseHref}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
          view === "liste"
            ? "bg-white text-[#1B6B8A] shadow-sm"
            : "text-zinc-600 hover:text-zinc-900",
        )}
      >
        <List className="h-3.5 w-3.5" /> Liste
      </Link>
      <Link
        href={`${baseHref}?view=kanban`}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
          view === "kanban"
            ? "bg-white text-[#1B6B8A] shadow-sm"
            : "text-zinc-600 hover:text-zinc-900",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Kanban
      </Link>
    </div>
  )
}
