"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export type ComboOption = { value: string; label: string; hint?: string | null; group?: string }

// Türkçe-duyarlı arama: "ı/i", "İ/i" ve aksanlar ("ç"→"c") eşleşsin.
function normalize(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function SearchCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç bulunamadı.",
  disabled,
  clearable,
}: {
  id?: string
  options: ComboOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? null

  const groups = useMemo(() => {
    const map = new Map<string, ComboOption[]>()
    for (const o of options) {
      const key = o.group ?? ""
      const list = map.get(key)
      if (list) list.push(o)
      else map.set(key, [o])
    }
    return Array.from(map.entries())
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm transition-colors",
              "hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40",
              "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70",
              clearable && selected && "pr-9",
            )}
          >
            <span className={cn("truncate", !selected && "text-zinc-400")}>
              {selected ? selected.label : placeholder}
            </span>
            {!(clearable && selected) && <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />}
          </button>
        </PopoverTrigger>
        {clearable && selected && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Seçimi temizle"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <PopoverContent id={listId} className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command
          // value = id (uuid); aramayı yalnızca etiket/ipucu üzerinden yap.
          filter={(_value, search, keywords) => {
            const hay = normalize((keywords ?? []).join(" "))
            return normalize(search)
              .split(/\s+/)
              .every((part) => hay.includes(part))
              ? 1
              : 0
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="h-11" />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map(([group, items]) => (
              <CommandGroup key={group || "_"} heading={group || undefined}>
                {items.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    keywords={[o.label, o.hint ?? ""]}
                    onSelect={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className="py-2.5"
                  >
                    <Check className={cn("h-4 w-4 text-[#F97316]", o.value === value ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="text-xs text-zinc-400 truncate max-w-[40%]">{o.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
