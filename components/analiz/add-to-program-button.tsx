"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CalendarPlus, Check, Loader2 } from "lucide-react"
import { addTopicToProgram } from "@/lib/analytics/analiz/actions"

export function AddToProgramButton({ topicId, topicName }: { topicId: string; topicName: string }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        start(async () => {
          const res = await addTopicToProgram(topicId)
          if (!res.success) return void toast.error(res.error ?? "Programa eklenemedi.")
          setDone(true)
          toast.success(`${topicName} bugünkü programına eklendi.`)
        })
      }
      className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : done ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <CalendarPlus className="h-3.5 w-3.5" />
      )}
      {done ? "Eklendi" : "Programa ekle"}
    </button>
  )
}
