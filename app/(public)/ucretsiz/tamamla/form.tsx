"use client"

import { useActionState } from "react"
import { completeGoogleSignupAction } from "./actions"
import { Button } from "@/components/ui/button"
import { ConsentFields } from "@/components/bireysel/consent-fields"
import { DurumAlanFields } from "@/components/bireysel/durum-alan-fields"
import type { Utm } from "@/lib/analytics/utm"

export function TamamlaForm({ utm }: { utm: Utm }) {
  const [state, action, pending] = useActionState(completeGoogleSignupAction, undefined)

  return (
    <form action={action} className="space-y-4">
      {Object.entries(utm).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <DurumAlanFields errorField={state?.field} />
      <ConsentFields errorField={state?.field} />
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full bg-[#EA580C] text-xl font-bold hover:bg-[#c2410c]" disabled={pending}>
        {pending ? "Hesabın hazırlanıyor..." : "Devam et"}
      </Button>
    </form>
  )
}
