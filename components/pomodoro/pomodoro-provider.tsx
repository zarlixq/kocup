"use client"

import { FocusModeDialog } from "./focus-mode-dialog"
import { PomodoroFloatingPill } from "./floating-pill"
import { usePomodoroEngine } from "./use-pomodoro-engine"

/**
 * Tek noktadan: tick engine'i mount eder, global dialog'u ve mobil pill'i renderlar.
 * Hem öğrenci hem koç panel layout'una bir kez eklenir.
 */
export function PomodoroProvider() {
  usePomodoroEngine()
  return (
    <>
      <FocusModeDialog />
      <PomodoroFloatingPill />
    </>
  )
}
