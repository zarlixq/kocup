"use client"

import { CircleHelp } from "lucide-react"
import { TOUR_START_EVENT } from "@/components/onboarding/product-tour"

/** Sidebar yardım bağlantısı: panel turunu baştan başlatır. */
export function TourRestartButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      data-tour="tour-help"
      onClick={() => {
        onClick?.()
        window.dispatchEvent(new Event(TOUR_START_EVENT))
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
    >
      <CircleHelp className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">Yardım: paneli tanı</span>
    </button>
  )
}
