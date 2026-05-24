"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function StudentSearch({
  defaultQ,
  defaultFilter,
  defaultSource,
}: {
  defaultQ: string
  defaultFilter: string
  defaultSource: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(defaultQ)

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString())
      if (q) params.set("q", q)
      else params.delete("q")
      router.replace(`/koc/ogrenciler?${params.toString()}`)
    }, 300)
    return () => clearTimeout(t)
  }, [q, router, sp])

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    params.set(key, value)
    router.replace(`/koc/ogrenciler?${params.toString()}`)
  }

  const filters = [
    { key: "aktif", label: "Aktif" },
    { key: "pasif", label: "Pasif" },
    { key: "tum", label: "Tümü" },
  ]

  const sources = [
    { key: "tum", label: "Tüm Kaynaklar" },
    { key: "basvuru", label: "Başvuru" },
    { key: "koc_ekledi", label: "Koç Ekledi" },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Ad veya okula göre ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => update("filtre", f.key)}
            className={cn(
              "px-3 py-1 text-sm rounded transition-colors",
              defaultFilter === f.key ? "bg-[#1B6B8A] text-white" : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => update("kaynak", s.key)}
            className={cn(
              "px-3 py-1 text-sm rounded transition-colors",
              defaultSource === s.key ? "bg-[#1B6B8A] text-white" : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
