"use client"

import { useOptimistic, useTransition } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { STATUS_LIST, type Status } from "@/components/konular/types"
import { updateTopicStatus } from "@/app/koc/ogrenciler/[id]/konular/actions"

type Props = {
  studentId: string
  trackingId: string
  status: Status
  disabled?: boolean
}

export function TopicStatusSegments({
  studentId,
  trackingId,
  status,
  disabled = false,
}: Props) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_, next: Status) => next,
  )
  const [pending, startTransition] = useTransition()

  function handleChange(next: Status) {
    if (next === optimisticStatus || pending || disabled) return
    startTransition(async () => {
      setOptimisticStatus(next)
      const res = await updateTopicStatus(studentId, trackingId, next)
      if (!res.success) {
        toast.error(res.error ?? "Güncellenemedi.")
      }
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label="Durum"
      className={cn(
        "inline-flex rounded-full bg-zinc-100 p-0.5",
        disabled && "opacity-70",
      )}
    >
      {STATUS_LIST.map((s) => {
        const isActive = optimisticStatus === s.value
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleChange(s.value)}
            disabled={disabled || (pending && !isActive)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full transition-all",
              isActive
                ? `bg-white shadow-sm ${s.tone.split(" ")[1]}`
                : "text-zinc-500 hover:text-zinc-900",
              disabled && "cursor-not-allowed hover:text-zinc-500",
            )}
            title={s.label}
          >
            {isActive ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}
