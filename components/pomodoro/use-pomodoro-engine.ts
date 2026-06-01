"use client"

import { useEffect, useRef } from "react"
import { usePomodoroStore } from "@/lib/pomodoro/store"

/**
 * Tek bir tick interval'i çevirir (250ms). Store'daki tick() çağrılır.
 * Birden fazla yerden çağrılırsa interval yine de tek seferde döner çünkü
 * provider'da yalnızca bir kez mount edilir (PomodoroProvider).
 *
 * Sayfa hidden'a düşüp tekrar görünür olduğunda anlık güncelleme için
 * visibilitychange listener de eklenir — uzun süreli throttling sonrası
 * UI'ın bir tick beklemesini engeller.
 */
export function usePomodoroEngine() {
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => usePomodoroStore.getState().tick()

    intervalRef.current = window.setInterval(tick, 250)
    tick()

    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])
}
