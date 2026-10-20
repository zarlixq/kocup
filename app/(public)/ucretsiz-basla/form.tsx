"use client"

import { useActionState, useState } from "react"
import { signupAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TurnstileWidget } from "@/components/security/turnstile-widget"
import { ConsentFields } from "@/components/bireysel/consent-fields"
import { ALANLAR, ALAN_LABEL } from "@/lib/upplan/profile"
import { YKS_GRADES } from "@/lib/bireysel/schemas"
import { cn } from "@/lib/utils"

type Utm = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }

function Choice({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onChange?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-center rounded-lg border px-3 py-2 text-center text-sm",
        disabled ? "cursor-not-allowed border-dashed border-zinc-200 text-zinc-400" : "cursor-pointer",
        !disabled && (checked ? "border-[#1B6B8A] bg-[#1B6B8A]/5 font-medium text-[#1B6B8A]" : "border-zinc-200 text-zinc-700"),
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange ?? (() => {})} disabled={disabled} required className="sr-only" />
      {children}
    </label>
  )
}

export function UcretsizBaslaForm({ utm }: { utm: Utm }) {
  const [state, action, pending] = useActionState(signupAction, undefined)
  const [status, setStatus] = useState<"lise" | "mezun">("lise")
  const [grade, setGrade] = useState<string>("")
  const [alan, setAlan] = useState<string>("")

  return (
    <form action={action} className="space-y-5">
      {utm.utm_source && <input type="hidden" name="utm_source" value={utm.utm_source} />}
      {utm.utm_medium && <input type="hidden" name="utm_medium" value={utm.utm_medium} />}
      {utm.utm_campaign && <input type="hidden" name="utm_campaign" value={utm.utm_campaign} />}

      <div className="space-y-1.5">
        <Label htmlFor="full_name">Ad soyad</Label>
        <Input id="full_name" name="full_name" key={`n-${state?.values?.full_name ?? ""}`} defaultValue={state?.values?.full_name} required minLength={3} maxLength={120} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" key={`e-${state?.values?.email ?? ""}`} defaultValue={state?.values?.email} required autoComplete="email" placeholder="ornek@mail.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="En az 8 karakter" />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-zinc-900">Sınav</legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice name="segment" value="yks" checked>YKS</Choice>
          <Choice name="segment_lgs" value="lgs" checked={false} disabled>
            LGS <span className="ml-1 text-xs">(yakında)</span>
          </Choice>
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-zinc-900">Durumun</legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice name="status" value="lise" checked={status === "lise"} onChange={() => setStatus("lise")}>Lise öğrencisiyim</Choice>
          <Choice name="status" value="mezun" checked={status === "mezun"} onChange={() => setStatus("mezun")}>Mezunum</Choice>
        </div>
      </fieldset>

      {status === "lise" && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-zinc-900">Sınıfın</legend>
          <div className="grid grid-cols-4 gap-2">
            {YKS_GRADES.map((g) => (
              <Choice key={g} name="grade" value={g} checked={grade === g} onChange={() => setGrade(g)}>
                {g}. sınıf
              </Choice>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-zinc-900">Alanın</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALANLAR.map((a) => (
            <Choice key={a} name="alan" value={a} checked={alan === a} onChange={() => setAlan(a)}>
              {ALAN_LABEL[a]}
            </Choice>
          ))}
        </div>
      </fieldset>

      <ConsentFields errorField={state?.field} />

      <TurnstileWidget resetKey={state} />

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <Button type="submit" className="w-full bg-[#F97316] hover:bg-[#ea6a0c]" disabled={pending}>
        {pending ? "Hesabın oluşturuluyor..." : "Ücretsiz hesabımı oluştur"}
      </Button>
    </form>
  )
}
