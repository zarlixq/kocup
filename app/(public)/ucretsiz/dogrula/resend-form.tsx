"use client"

import { useActionState } from "react"
import { resendVerificationAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, undefined)

  return (
    <form action={action} className="space-y-2">
      <Input name="email" type="email" defaultValue={email} required placeholder="E-posta adresin" aria-label="E-posta adresin" />
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? "Gönderiliyor..." : "Bağlantıyı tekrar gönder"}
      </Button>
      {state && (
        <p className={state.success ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{state.message}</p>
      )}
    </form>
  )
}
