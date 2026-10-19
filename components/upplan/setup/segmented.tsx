"use client"

import { cn } from "@/lib/utils"

// Küçük tek-seçimli segment kontrol (radiogroup).
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  toneFor,
}: {
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  label: string
  size?: "sm" | "md"
  className?: string
  /** Seçili segmentin rengi (varsayılan marka mavisi). */
  toneFor?: (v: T) => string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-xl bg-zinc-100 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
              active
                ? cn("shadow-sm", toneFor ? toneFor(o.value) : "bg-white text-[#1B6B8A]")
                : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
