"use client"

import { useState } from "react"
import { Play, Pause, RotateCcw, SkipForward, Minus, Plus, Settings2, Volume2, VolumeX } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  usePomodoroStore,
  MODE_LABELS,
  POMODORO_LIMITS,
  type PomodoroMode,
} from "@/lib/pomodoro/store"
import { primeAudio } from "@/lib/pomodoro/chime"
import { ensurePermission } from "@/lib/pomodoro/notifications"
import { TimerRing, formatMs } from "./timer-ring"

const MODE_TEXT_COLOR: Record<PomodoroMode, string> = {
  work: "text-[#F97316]",
  shortBreak: "text-teal-600",
  longBreak: "text-teal-700",
}

function MinuteStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm text-zinc-700">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={dec}
          disabled={value <= min}
          aria-label={`${label} azalt`}
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <div className="w-14 text-center text-sm font-bold tabular-nums text-zinc-900">
          {value} <span className="text-xs font-medium text-zinc-400">dk</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={inc}
          disabled={value >= max}
          aria-label={`${label} arttır`}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function FocusModeDialog() {
  const [showSettings, setShowSettings] = useState(false)

  const s = usePomodoroStore(
    useShallow((st) => ({
      focusOpen: st.focusOpen,
      mode: st.mode,
      isRunning: st.isRunning,
      remainingMs: st.remainingMs,
      completedCycles: st.completedCycles,
      cyclesSinceLongBreak: st.cyclesSinceLongBreak,
      workMinutes: st.workMinutes,
      shortBreakMinutes: st.shortBreakMinutes,
      longBreakMinutes: st.longBreakMinutes,
      autoStartBreaks: st.autoStartBreaks,
      autoStartWork: st.autoStartWork,
      soundEnabled: st.soundEnabled,
      longBreakInterval: st.longBreakInterval,
      setFocus: st.setFocus,
      start: st.start,
      pause: st.pause,
      resume: st.resume,
      reset: st.reset,
      skip: st.skip,
      setMode: st.setMode,
      updateSettings: st.updateSettings,
    })),
  )

  const totalMinutes =
    s.mode === "work" ? s.workMinutes : s.mode === "shortBreak" ? s.shortBreakMinutes : s.longBreakMinutes
  const totalMs = totalMinutes * 60 * 1000
  const progress = totalMs > 0 ? 1 - s.remainingMs / totalMs : 0

  const onPlayPause = () => {
    primeAudio()
    void ensurePermission()
    if (s.isRunning) s.pause()
    else if (s.remainingMs > 0 && s.remainingMs < totalMs) s.resume()
    else s.start()
  }

  const showResume = s.remainingMs > 0 && s.remainingMs < totalMs && !s.isRunning

  return (
    <Dialog open={s.focusOpen} onOpenChange={s.setFocus}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Pomodoro Odak Modu</DialogTitle>

        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold uppercase tracking-widest", MODE_TEXT_COLOR[s.mode])}>
              {MODE_LABELS[s.mode]}
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500">
              Bugün <span className="font-bold text-zinc-900">{s.completedCycles}</span> pomodoro
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label={showSettings ? "Ayarları kapat" : "Ayarları aç"}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showSettings ? "bg-zinc-100 text-[#1B6B8A]" : "text-zinc-400 hover:text-[#1B6B8A] hover:bg-zinc-100",
            )}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {!showSettings ? (
          <div className="px-6 pb-6">
            <Tabs
              value={s.mode}
              onValueChange={(v) => s.setMode(v as PomodoroMode)}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-3 bg-zinc-100 p-1 h-9">
                <TabsTrigger
                  value="work"
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1B6B8A] data-[state=active]:shadow-sm"
                >
                  Çalışma
                </TabsTrigger>
                <TabsTrigger
                  value="shortBreak"
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
                >
                  Kısa Mola
                </TabsTrigger>
                <TabsTrigger
                  value="longBreak"
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
                >
                  Uzun Mola
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex justify-center mb-7">
              <TimerRing progress={progress} mode={s.mode} size={240} strokeWidth={12}>
                <div className="flex flex-col items-center">
                  <span
                    className="text-5xl font-extrabold tabular-nums tracking-tight text-zinc-900"
                    role="timer"
                    aria-live={s.isRunning ? "off" : "polite"}
                    aria-atomic="true"
                  >
                    {formatMs(s.remainingMs)}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-bold text-zinc-400 mt-1">
                    {s.cyclesSinceLongBreak}/{s.longBreakInterval} tur
                  </span>
                </div>
              </TimerRing>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center max-w-xs mx-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full h-11 w-11"
                onClick={s.reset}
                aria-label="Sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant={s.mode === "work" ? "accent" : "default"}
                onClick={onPlayPause}
                className="rounded-full h-12 text-sm font-bold uppercase tracking-wider"
                aria-label={s.isRunning ? "Duraklat" : showResume ? "Devam et" : "Başlat"}
              >
                {s.isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Duraklat
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    {showResume ? "Devam" : "Başlat"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full h-11 w-11"
                onClick={s.skip}
                aria-label="Atla"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Süreler
              </div>
              <div className="space-y-3">
                <MinuteStepper
                  label="Çalışma"
                  value={s.workMinutes}
                  min={POMODORO_LIMITS.workMin}
                  max={POMODORO_LIMITS.workMax}
                  onChange={(v) => s.updateSettings({ workMinutes: v })}
                />
                <MinuteStepper
                  label="Kısa Mola"
                  value={s.shortBreakMinutes}
                  min={POMODORO_LIMITS.shortMin}
                  max={POMODORO_LIMITS.shortMax}
                  onChange={(v) => s.updateSettings({ shortBreakMinutes: v })}
                />
                <MinuteStepper
                  label="Uzun Mola"
                  value={s.longBreakMinutes}
                  min={POMODORO_LIMITS.longMin}
                  max={POMODORO_LIMITS.longMax}
                  onChange={(v) => s.updateSettings({ longBreakMinutes: v })}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Otomatik Akış
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoBreaks" className="text-sm text-zinc-700">
                    Molaları otomatik başlat
                  </Label>
                  <Switch
                    id="autoBreaks"
                    checked={s.autoStartBreaks}
                    onCheckedChange={(c) => s.updateSettings({ autoStartBreaks: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoWork" className="text-sm text-zinc-700">
                    Çalışmayı otomatik başlat
                  </Label>
                  <Switch
                    id="autoWork"
                    checked={s.autoStartWork}
                    onCheckedChange={(c) => s.updateSettings({ autoStartWork: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound" className="text-sm text-zinc-700 flex items-center gap-2">
                    {s.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    Bitiş sesi
                  </Label>
                  <Switch
                    id="sound"
                    checked={s.soundEnabled}
                    onCheckedChange={(c) => s.updateSettings({ soundEnabled: c })}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed pt-1">
              {s.longBreakInterval} çalışma seansından sonra uzun mola otomatik gelir.
              Ayarlar bu cihazda saklanır.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
