"use client"

import { useActionState } from "react"
import { acceptInvitationAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConsentFields } from "@/components/bireysel/consent-fields"
import { TurnstileWidget } from "@/components/security/turnstile-widget"

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, undefined)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="En az 8 karakter" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password_confirm">Şifre tekrar</Label>
        <Input id="password_confirm" name="password_confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </div>

      <ConsentFields errorField={state?.field} />
      <TurnstileWidget resetKey={state} />

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
        {pending ? "Hesabın oluşturuluyor..." : "Hesabımı oluştur"}
      </Button>
    </form>
  )
}
