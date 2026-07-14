"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronsUpDown, Plus, Check, X, User } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createDemoSetter } from "@/app/mudur/satis-takibi/actions"

export type SetterOption = { id: string; name: string }

/**
 * "Ekle-yapabilen" (creatable) ayarlayan seçici. Aktif demo_setters listesi;
 * dropdown İÇİNDEN yeni isim eklenebilir (server action → seç, tek akış).
 * Popover/Command primitifi yok → kendi panelini + backdrop click-outside kurar.
 */
export function SetterSelect({
  setters,
  value,
  onChange,
  size = "default",
}: {
  setters: SetterOption[]
  value: string | null
  onChange: (id: string | null, opt?: SetterOption) => void
  size?: "default" | "sm"
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [list, setList] = useState<SetterOption[]>(setters)
  const [isPending, startTransition] = useTransition()

  const selected = useMemo(() => list.find((s) => s.id === value) ?? null, [list, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR")
    if (!q) return list
    return list.filter((s) => s.name.toLocaleLowerCase("tr-TR").includes(q))
  }, [list, query])

  const trimmed = query.trim()
  const exactExists = list.some(
    (s) => s.name.toLocaleLowerCase("tr-TR") === trimmed.toLocaleLowerCase("tr-TR"),
  )
  const canCreate = trimmed.length >= 2 && !exactExists

  function close() {
    setOpen(false)
    setQuery("")
  }

  function pick(opt: SetterOption) {
    onChange(opt.id, opt)
    close()
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createDemoSetter(trimmed)
      if (res.success && res.data) {
        // Listeye ekle (yoksa) ve seç
        setList((prev) =>
          prev.some((s) => s.id === res.data!.id) ? prev : [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name, "tr")),
        )
        onChange(res.data.id, res.data)
        close()
      } else {
        toast.error(res.error ?? "Ayarlayan eklenemedi.")
      }
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white text-left text-zinc-900 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#1B6B8A]/30",
          size === "sm" ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
        )}
      >
        <span className={cn("flex items-center gap-1.5 truncate", !selected && "text-zinc-400")}>
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          {selected ? selected.name : "Seçilmedi"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div className="absolute z-50 mt-1 w-full min-w-[12rem] rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div className="p-2 border-b border-zinc-100">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara veya yeni ekle..."
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    close()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50"
                >
                  <X className="h-3.5 w-3.5" /> Temizle
                </button>
              )}
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50"
                >
                  <span className="truncate">{s.name}</span>
                  {s.id === value && <Check className="h-3.5 w-3.5 text-[#1B6B8A]" />}
                </button>
              ))}
              {filtered.length === 0 && !canCreate && (
                <div className="px-3 py-2 text-xs text-zinc-400">Kayıt yok.</div>
              )}
              {canCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#1B6B8A] hover:bg-[#1B6B8A]/5 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  &ldquo;{trimmed}&rdquo; ekle
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
