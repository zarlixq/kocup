"use client"

import { useCallback, useEffect, useRef } from "react"
import { driver, type DriveStep, type Driver } from "driver.js"
import "driver.js/dist/driver.css"
import { saveTourState } from "@/lib/onboarding/actions"
import { shouldAutoStart, tourSteps, type TourRole, type TourState } from "@/lib/onboarding/tours"
import type { Track } from "@/lib/upplan/track"

/** Yardım menüsündeki "Turu başlat" bu olayı yayınlar. */
export const TOUR_START_EVENT = "kocup:tour-start"

/** Hedef öğe görünmüyorsa (ör. mobilde kapalı sidebar) adım ekran ortasında açılır. */
function visible(selector: string | undefined): boolean {
  if (!selector) return false
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && el.offsetParent !== null
}

/**
 * Rol + track bazlı panel turu. İlk girişte açılır; atlanabilir; yarıda kalırsa
 * kaldığı adımdan sürer; durum user_ui_preferences'ta.
 */
export function ProductTour({ role, track, initial }: { role: TourRole; track: Track | null; initial: TourState | undefined }) {
  const ref = useRef<Driver | null>(null)
  const finished = useRef(false)

  const start = useCallback(
    (from: number) => {
      ref.current?.destroy()
      const steps = tourSteps(role, track)
      const driveSteps: DriveStep[] = steps.map((s) => ({
        ...(visible(s.element) ? { element: s.element } : {}),
        popover: { title: s.title, description: s.description },
      }))
      finished.current = false
      const d = driver({
        steps: driveSteps,
        showProgress: true,
        progressText: "{{current}} / {{total}}",
        nextBtnText: "İleri",
        prevBtnText: "Geri",
        doneBtnText: "Bitir",
        allowClose: true,
        popoverClass: "kocup-tour",
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 10,
        onHighlighted: (_el, _step, { state }) => {
          void saveTourState({ role, status: "devam", step: state.activeIndex ?? 0 })
        },
        onNextClick: (_el, _step, { driver: drv }) => {
          if (drv.isLastStep()) {
            finished.current = true
            void saveTourState({ role, status: "bitti", step: steps.length - 1 })
            drv.destroy()
            return
          }
          drv.moveNext()
        },
        onCloseClick: (_el, _step, { driver: drv, state }) => {
          finished.current = true
          void saveTourState({ role, status: "atlandi", step: state.activeIndex ?? 0 })
          drv.destroy()
        },
      })
      ref.current = d
      d.drive(Math.min(Math.max(from, 0), driveSteps.length - 1))
    },
    [role, track],
  )

  useEffect(() => {
    // Sayfa çizildikten sonra (hedef öğeler DOM'da) başlat.
    const t = shouldAutoStart(initial) ? window.setTimeout(() => start(initial?.status === "devam" ? initial.step : 0), 600) : undefined
    const onStart = () => start(0)
    window.addEventListener(TOUR_START_EVENT, onStart)
    return () => {
      if (t) window.clearTimeout(t)
      window.removeEventListener(TOUR_START_EVENT, onStart)
      ref.current?.destroy()
    }
  }, [initial, start])

  return null
}
