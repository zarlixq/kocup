"use client"

import { Play, Pause, Maximize2 } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { usePomodoroStore, MODE_LABELS, type PomodoroMode } from "@/lib/pomodoro/store"
import { primeAudio } from "@/lib/pomodoro/chime"
import { ensurePermission } from "@/lib/pomodoro/notifications"
import { TimerRing, formatMs } from "./timer-ring"
import { usePomodoroHydrated } from "./use-hydrated"
import { cn } from "@/lib/utils"

const MODE_TEXT: Record<PomodoroMode, string> = {
  work: "text-[#F97316]",
  shortBreak: "text-teal-600",
  longBreak: "text-teal-700",
}

export function PomodoroWidget() {
  const hydrated = usePomodoroHydrated()

  const {
    mode,
    isRunning,
    remainingMs,
    workMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    completedCycles,
    start,
    pause,
    resume,
    openFocus,
  } = usePomodoroStore(
    useShallow((s) => ({
      mode: s.mode,
      isRunning: s.isRunning,
      remainingMs: s.remainingMs,
      workMinutes: s.workMinutes,
      shortBreakMinutes: s.shortBreakMinutes,
      longBreakMinutes: s.longBreakMinutes,
      completedCycles: s.completedCycles,
      start: s.start,
      pause: s.pause,
      resume: s.resume,
      openFocus: s.openFocus,
    })),
  )

  const totalMinutes =
    mode === "work" ? workMinutes : mode === "shortBreak" ? shortBreakMinutes : longBreakMinutes
  const totalMs = totalMinutes * 60 * 1000
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0

  const onPlay = () => {
    if (!hydrated) return
    primeAudio()
    void ensurePermission()
    if (isRunning) pause()
    else if (remainingMs > 0 && remainingMs < totalMs) resume()
    else start()
  }

  // Hydration mismatch'ı önle: ssr'da bilinen default'la render
  const displayMs = hydrated ? remainingMs : totalMs

  return (
    <div className="mx-3 my-2 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", MODE_TEXT[mode])}>
            {MODE_LABELS[mode]}
          </span>
        </div>
        <button
          type="button"
          onClick={openFocus}
          aria-label="Odak modunu aç"
          className="p-1 rounded-md text-zinc-400 hover:text-[#1B6B8A] hover:bg-zinc-100 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <TimerRing progress={progress} mode={mode} size={66} strokeWidth={6}>
          <span
            className="text-xs font-bold tabular-nums tracking-tight text-zinc-900"
            role="timer"
            aria-live={isRunning ? "off" : "polite"}
            aria-atomic="true"
          >
            {formatMs(displayMs)}
          </span>
        </TimerRing>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onPlay}
            aria-label={isRunning ? "Duraklat" : "Başlat"}
            className={cn(
              "w-full inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors min-h-[36px] px-3",
              isRunning
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                : "bg-[#F97316] text-white hover:bg-[#ea6c10]",
            )}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Duraklat
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                {remainingMs > 0 && remainingMs < totalMs ? "Devam" : "Başlat"}
              </>
            )}
          </button>
          <div className="text-[10px] text-zinc-500 mt-1.5 leading-tight text-center">
            Bugün <span className="font-bold text-zinc-700">{hydrated ? completedCycles : 0}</span> pomodoro
          </div>
        </div>
      </div>
    </div>
  )
}
