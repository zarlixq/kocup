"use client"

import { useRef } from "react"
import Link from "next/link"
import { Play, Pause, Maximize2, ArrowRight } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PomodoroProvider } from "@/components/pomodoro/pomodoro-provider"
import { TimerRing, formatMs } from "@/components/pomodoro/timer-ring"
import { usePomodoroHydrated } from "@/components/pomodoro/use-hydrated"
import { usePomodoroStore, MODE_LABELS } from "@/lib/pomodoro/store"
import { primeAudio } from "@/lib/pomodoro/chime"
import { ensurePermission } from "@/lib/pomodoro/notifications"
import { trackToolUse } from "@/lib/analytics/track"
import { cn } from "@/lib/utils"

/**
 * Halka açık & panel için Pomodoro UI.
 *
 * withProvider:
 *   - true (default): PomodoroProvider'ı kendi içinde mount eder. Public sayfalarda kullan.
 *   - false: panel layout zaten Provider mount ettiği için kapat. İki engine eşzamanlı çalışmasın.
 */
export function PomodoroPublic({ withProvider = true }: { withProvider?: boolean }) {
  const hydrated = usePomodoroHydrated()

  // İlk "Başlat"/"Devam"da OTURUM/MOUNT başına BİR KEZ tool_use eventi gönder.
  // Mount'ta gönderme — kullanıcı sayfayı sadece açtı ama timer'ı başlatmadıysa
  // bu bir "use" değildir.
  const trackedRef = useRef(false)

  const s = usePomodoroStore(
    useShallow((st) => ({
      mode: st.mode,
      isRunning: st.isRunning,
      remainingMs: st.remainingMs,
      workMinutes: st.workMinutes,
      shortBreakMinutes: st.shortBreakMinutes,
      longBreakMinutes: st.longBreakMinutes,
      completedCycles: st.completedCycles,
      start: st.start,
      pause: st.pause,
      resume: st.resume,
      openFocus: st.openFocus,
    }))
  )

  const totalMinutes =
    s.mode === "work"
      ? s.workMinutes
      : s.mode === "shortBreak"
        ? s.shortBreakMinutes
        : s.longBreakMinutes
  const totalMs = totalMinutes * 60 * 1000
  const progress = totalMs > 0 ? 1 - s.remainingMs / totalMs : 0
  const displayMs = hydrated ? s.remainingMs : totalMs

  const onPlay = () => {
    if (!hydrated) return
    primeAudio()
    void ensurePermission()
    if (s.isRunning) {
      s.pause()
      return
    }
    if (!trackedRef.current) {
      trackedRef.current = true
      trackToolUse("pomodoro")
    }
    if (s.remainingMs > 0 && s.remainingMs < totalMs) {
      s.resume()
    } else {
      s.start()
    }
  }

  return (
    <>
      {withProvider && <PomodoroProvider />}
      <Card className="p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3">
            {MODE_LABELS[s.mode]}
          </span>

          <TimerRing progress={progress} mode={s.mode} size={220} strokeWidth={14}>
            <span
              className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-zinc-900"
              role="timer"
              aria-live={s.isRunning ? "off" : "polite"}
              aria-atomic="true"
            >
              {formatMs(displayMs)}
            </span>
          </TimerRing>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              onClick={onPlay}
              aria-label={s.isRunning ? "Duraklat" : "Başlat"}
              className={cn(
                "min-h-[48px] px-8 rounded-full text-base font-semibold transition-colors",
                s.isRunning
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  : "bg-[#F97316] hover:bg-[#ea6c10] text-white"
              )}
            >
              {s.isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" aria-hidden="true" />
                  Duraklat
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" aria-hidden="true" />
                  {s.remainingMs > 0 && s.remainingMs < totalMs ? "Devam" : "Başlat"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={s.openFocus}
              aria-label="Odak modu — tam ekran"
              className="min-h-[48px] px-6 rounded-full text-base font-medium"
            >
              <Maximize2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Odak Modu
            </Button>
          </div>

          <div className="mt-5 text-sm text-zinc-500">
            Bugün{" "}
            <span className="font-bold text-zinc-700 tabular-nums">
              {hydrated ? s.completedCycles : 0}
            </span>{" "}
            pomodoro tamamladın
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-zinc-200">
          <p className="text-sm text-zinc-600 mb-2.5">
            Çalışma planını koçunla birlikte kur, dikkatini sürekli üst seviyede tut.
          </p>
          <Link
            href="/basvuru"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F97316] hover:gap-2.5 transition-all"
          >
            Ücretsiz başvur
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </>
  )
}
