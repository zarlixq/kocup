import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Color = "blue" | "green" | "orange" | "purple"

const COLOR_MAP: Record<Color, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
}

type StatsCardProps = {
  icon: LucideIcon
  title: string
  value: number | string
  subtitle?: string
  color?: Color
  href?: string
}

export function StatsCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "blue",
  href,
}: StatsCardProps) {
  const c = COLOR_MAP[color]

  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-600">{title}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon className={cn("w-5 h-5", c.text)} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-zinc-900 tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-zinc-400 mt-1">{subtitle}</div>}
    </>
  )

  const baseClasses =
    "bg-white border border-zinc-200 rounded-2xl p-5 transition-all motion-reduce:transition-none"

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          baseClasses,
          "block hover:border-[#1B6B8A] hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none",
        )}
      >
        {inner}
      </Link>
    )
  }
  return (
    <div
      className={cn(
        baseClasses,
        "hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none",
      )}
    >
      {inner}
    </div>
  )
}
