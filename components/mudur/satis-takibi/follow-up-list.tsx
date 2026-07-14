"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CalendarClock, Check, X as XIcon, ThumbsDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DemoScheduleDialog,
  type ScheduleTarget,
} from "@/components/mudur/satis-takibi/demo-schedule-dialog"
import { type SetterOption } from "@/components/mudur/satis-takibi/setter-select"
import { formatDemoDateTime, DEMO_DISPLAY } from "@/lib/satis-takibi"
import { markDemoResult, setLeadDurum } from "@/app/mudur/satis-takibi/actions"

export type FollowUpItem = {
  leadId: string
  kurumAdi: string
  demoId: string
  scheduledAt: string
  kind: "awaiting" | "no_show"
  setById: string | null
  setterName: string | null
}

export function FollowUpList({
  items,
  setters,
}: {
  items: FollowUpItem[]
  setters: SetterOption[]
}) {
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleTarget | null>(null)

  if (items.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-[#F97316]/30 bg-[#F97316]/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-5 h-5 text-[#F97316]" />
        <h2 className="font-semibold text-zinc-900">Takip edilmesi gerekenler</h2>
        <span className="text-xs font-semibold text-[#F97316] bg-[#F97316]/10 rounded-full px-2 py-0.5">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <FollowUpRow
            key={item.demoId}
            item={item}
            onReschedule={() =>
              setRescheduleTarget({
                mode: "reschedule",
                appointmentId: item.demoId,
                defaultSetterId: item.setById,
              })
            }
          />
        ))}
      </div>

      {rescheduleTarget && (
        <DemoScheduleDialog
          target={rescheduleTarget}
          setters={setters}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  )
}

function FollowUpRow({
  item,
  onReschedule,
}: {
  item: FollowUpItem
  onReschedule: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const badge = DEMO_DISPLAY[item.kind]

  function mark(showedUp: boolean) {
    startTransition(async () => {
      const res = await markDemoResult(item.demoId, { showed_up: showedUp })
      if (res.success) {
        toast.success(showedUp ? "Geldi olarak işaretlendi." : "Gelmedi olarak işaretlendi.")
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  function markLost() {
    startTransition(async () => {
      const res = await setLeadDurum(item.leadId, "kaybedildi")
      if (res.success) toast.success("Kurum kaybedildi olarak işaretlendi.")
      else toast.error(res.error ?? "İşlem başarısız.")
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white border border-zinc-200 px-3 py-2 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/mudur/satis-takibi/${item.leadId}`}
            className="font-medium text-zinc-900 truncate hover:text-[#1B6B8A]"
          >
            {item.kurumAdi}
          </Link>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
              badge.color,
            )}
          >
            {badge.label}
          </span>
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {formatDemoDateTime(item.scheduledAt)}
          {item.setterName && <span> · Ayarlayan: {item.setterName}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.kind === "awaiting" ? (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-8"
              onClick={() => mark(true)}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Geldi
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => mark(false)}
              disabled={isPending}
            >
              <XIcon className="h-3.5 w-3.5 mr-1" /> Gelmedi
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="accent" className="h-8" onClick={onReschedule} disabled={isPending}>
              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Yeni Randevu
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-zinc-600"
              onClick={markLost}
              disabled={isPending}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Kaybedildi
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
