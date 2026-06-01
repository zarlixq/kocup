"use client"

import { Play, Pause } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { usePomodoroStore, MODE_LABELS, type PomodoroMode } from "@/lib/pomodoro/store"
import { primeAudio } from "@/lib/pomodoro/chime"
import { formatMs } from "./timer-ring"
import { usePomodoroHydrated } from "./use-hydrated"
import { cn } from "@/lib/utils"

const MODE_DOT: Record<PomodoroMode, string> = {
  work: "bg-[#F97316]",
  shortBreak: "bg-teal-500",
  longBreak: "bg-teal-600",
}

/**
 * Mobil cihazlarda (md altı) sidebar kapalıyken çalışan timer için sabit pill.
 * Yalnızca timer aktifken (running veya kısmen tüketilmiş) görünür.
 */
export function PomodoroFloatingPill() {
  const hydrated = usePomodoroHydrated()

  const {
    mode,
    isRunning,
    remainingMs,
    workMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    pause,
    resume,
    start,
    openFocus,
  } = usePomodoroStore(
    useShallow((s) => ({
      mode: s.mode,
      isRunning: s.isRunning,
      remainingMs: s.remainingMs,
      workMinutes: s.workMinutes,
      shortBreakMinutes: s.shortBreakMinutes,
      longBreakMinutes: s.longBreakMinutes,
      pause: s.pause,
      resume: s.resume,
      start: s.start,
      openFocus: s.openFocus,
    })),
  )

  if (!hydrated) return null

  const totalMinutes =
    mode === "work" ? workMinutes : mode === "shortBreak" ? shortBreakMinutes : longBreakMinutes
  const totalMs = totalMinutes * 60 * 1000
  const isActive = isRunning || (remainingMs > 0 && remainingMs < totalMs)
  if (!isActive) return null

  const onPlayPause = () => {
    primeAudio()
    if (isRunning) pause()
    else if (remainingMs > 0 && remainingMs < totalMs) resume()
    else start()
  }

  return (
    <div
      className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full bg-zinc-900 text-white shadow-2xl shadow-black/30 pl-1.5 pr-1.5 py-1.5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.375rem)" }}
    >
      <button
        type="button"
        onClick={openFocus}
        aria-label="Pomodoro odak modunu aç"
        className="flex items-center gap-2.5 pl-3 pr-2 min-h-[44px] rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
      >
        <span className={cn("w-2 h-2 rounded-full", MODE_DOT[mode], isRunning && "animate-pulse")} aria-hidden />
        <span
          className="text-sm font-bold tabular-nums tracking-tight"
          role="timer"
          aria-live="off"
        >
          {formatMs(remainingMs)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-white/70">
          {MODE_LABELS[mode]}
        </span>
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        aria-label={isRunning ? "Duraklat" : "Devam et"}
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded-full transition-colors shrink-0",
          isRunning ? "bg-white/10 hover:bg-white/15" : "bg-[#F97316] hover:bg-[#ea6c10]",
        )}
      >
        {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
      </button>
    </div>
  )
}
