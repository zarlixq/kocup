"use client"

import { useState } from "react"
import { ALANLAR, ALAN_LABEL } from "@/lib/upplan/profile"
import { DURUMLAR, type Durum } from "@/lib/bireysel/schemas"
import { cn } from "@/lib/utils"

// Ücretsiz kayıt ve Google ile ilk giriş: sınıf/mezun + alan seçimi (native radio → FormData).

const ALAN_SHORT: Record<(typeof ALANLAR)[number], string> = { sayisal: "Sayısal", ea: "EA", sozel: "Sözel", dil: "Dil" }

function Choice({
  name,
  value,
  checked,
  onChange,
  invalid,
  title,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  invalid?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <label
      title={title}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1B6B8A]/40",
        checked ? "border-[#1B6B8A] bg-[#1B6B8A]/5 font-medium text-[#1B6B8A]" : "border-zinc-200 text-zinc-700",
        invalid && !checked && "border-red-300",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} required className="sr-only" />
      {children}
    </label>
  )
}

export function DurumAlanFields({ errorField }: { errorField?: string }) {
  const [durum, setDurum] = useState<Durum | null>(null)
  const [alan, setAlan] = useState<string | null>(null)

  return (
    <>
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium text-zinc-900">Sınıfın</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {DURUMLAR.map((d) => (
            <Choice key={d} name="durum" value={d} checked={durum === d} onChange={() => setDurum(d)} invalid={errorField === "durum"}>
              {d === "mezun" ? "Mezun" : d}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium text-zinc-900">Alanın</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {ALANLAR.map((a) => (
            <Choice key={a} name="alan" value={a} checked={alan === a} onChange={() => setAlan(a)} invalid={errorField === "alan"} title={ALAN_LABEL[a]}>
              {ALAN_SHORT[a]}
            </Choice>
          ))}
        </div>
      </fieldset>
    </>
  )
}
