"use client"

import { useSyncExternalStore } from "react"
import { usePomodoroStore } from "@/lib/pomodoro/store"

/**
 * Persist middleware'in localStorage'tan hydrate olmasını bekler.
 * Hydration sırasında SSR'la aynı default değerleri göstermek için
 * componentler bunu false→true geçişine göre dallandırır.
 */
export function usePomodoroHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => usePomodoroStore.persist.onFinishHydration(cb),
    () => usePomodoroStore.persist.hasHydrated(),
    () => false,
  )
}
