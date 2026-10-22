"use client"

import { useActionState, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { signupAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TurnstileWidget } from "@/components/security/turnstile-widget"
import { ConsentFields } from "@/components/bireysel/consent-fields"
import { DurumAlanFields } from "@/components/bireysel/durum-alan-fields"
import { currentUtm, UTM_KEYS } from "@/lib/analytics/utm"

export function UcretsizForm() {
  const [state, action, pending] = useActionState(signupAction, undefined)
  const [showPassword, setShowPassword] = useState(false)

  // UTM reklam linkinden (ya da ana sayfaya gelişte saklanan çerezden) okunur; sayfa statik kalır.
  function submit(formData: FormData) {
    const utm = currentUtm()
    for (const k of UTM_KEYS) if (utm[k]) formData.set(k, utm[k]!)
    action(formData)
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Ad soyad</Label>
        <Input id="full_name" name="full_name" key={`n-${state?.values?.full_name ?? ""}`} defaultValue={state?.values?.full_name} required minLength={3} maxLength={120} autoComplete="name" className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" name="email" type="email" inputMode="email" key={`e-${state?.values?.email ?? ""}`} defaultValue={state?.values?.email} required autoComplete="email" placeholder="ornek@mail.com" className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={72} autoComplete="new-password" placeholder="En az 8 karakter" className="h-11 pr-11" />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 hover:text-zinc-800"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <DurumAlanFields errorField={state?.field} />

      <ConsentFields errorField={state?.field} />

      <TurnstileWidget resetKey={state} />

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" className="h-12 w-full bg-[#EA580C] text-xl font-bold hover:bg-[#c2410c]" disabled={pending}>
        {pending ? "Hesabın oluşturuluyor..." : "Ücretsiz başla"}
      </Button>
      <p className="text-center text-xs text-zinc-500">YKS için · LGS yakında</p>
    </form>
  )
}
