import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { playChime } from "./chime"
import { notify } from "./notifications"

export type PomodoroMode = "work" | "shortBreak" | "longBreak"

export const MODE_LABELS: Record<PomodoroMode, string> = {
  work: "Çalışma",
  shortBreak: "Kısa Mola",
  longBreak: "Uzun Mola",
}

const DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: true,
  autoStartWork: false,
  soundEnabled: true,
  longBreakInterval: 4,
}

type Settings = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
  longBreakInterval: number
}

type SessionState = {
  mode: PomodoroMode
  isRunning: boolean
  endTimestamp: number | null
  remainingMs: number
  completedCycles: number
  cyclesSinceLongBreak: number
  lastActiveDate: string
}

type UiState = {
  focusOpen: boolean
}

type Actions = {
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: PomodoroMode) => void
  tick: () => void
  completeCurrent: (opts?: { silent?: boolean; countCycle?: boolean }) => void
  updateSettings: (patch: Partial<Settings>) => void
  openFocus: () => void
  closeFocus: () => void
  setFocus: (open: boolean) => void
}

export type PomodoroState = Settings & SessionState & UiState & Actions

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const modeMinutes = (s: Settings, m: PomodoroMode) =>
  m === "work"
    ? s.workMinutes
    : m === "shortBreak"
      ? s.shortBreakMinutes
      : s.longBreakMinutes

const modeMs = (s: Settings, m: PomodoroMode) => modeMinutes(s, m) * 60 * 1000

const clampMinutes = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(n)))

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      // settings
      ...DEFAULTS,

      // session
      mode: "work",
      isRunning: false,
      endTimestamp: null,
      remainingMs: DEFAULTS.workMinutes * 60 * 1000,
      completedCycles: 0,
      cyclesSinceLongBreak: 0,
      lastActiveDate: today(),

      // ui
      focusOpen: false,

      start: () => {
        const s = get()
        const duration = modeMs(s, s.mode)
        const remaining = s.remainingMs > 0 && s.remainingMs <= duration ? s.remainingMs : duration
        const endTimestamp = Date.now() + remaining
        set({ isRunning: true, endTimestamp, remainingMs: remaining })
      },

      pause: () => {
        const s = get()
        if (!s.isRunning) return
        const remaining = s.endTimestamp != null ? Math.max(0, s.endTimestamp - Date.now()) : s.remainingMs
        set({ isRunning: false, endTimestamp: null, remainingMs: remaining })
      },

      resume: () => {
        const s = get()
        if (s.isRunning) return
        const duration = modeMs(s, s.mode)
        const remaining = s.remainingMs > 0 ? s.remainingMs : duration
        const endTimestamp = Date.now() + remaining
        set({ isRunning: true, endTimestamp, remainingMs: remaining })
      },

      reset: () => {
        const s = get()
        set({
          isRunning: false,
          endTimestamp: null,
          remainingMs: modeMs(s, s.mode),
        })
      },

      skip: () => {
        get().completeCurrent({ silent: true, countCycle: false })
      },

      setMode: (mode) => {
        const s = get()
        set({
          mode,
          isRunning: false,
          endTimestamp: null,
          remainingMs: modeMs(s, mode),
        })
      },

      tick: () => {
        const s = get()
        if (!s.isRunning || s.endTimestamp == null) return
        const remaining = Math.max(0, s.endTimestamp - Date.now())
        if (remaining !== s.remainingMs) set({ remainingMs: remaining })
        if (remaining <= 0) get().completeCurrent()
      },

      completeCurrent: ({ silent, countCycle = true } = {}) => {
        const s = get()
        const wasWork = s.mode === "work"

        // bugünkü pomodoro sayacı — gün değişmişse sıfırla
        const todayStr = today()
        let completedCycles = s.completedCycles
        let lastActiveDate = s.lastActiveDate
        if (lastActiveDate !== todayStr) {
          completedCycles = 0
          lastActiveDate = todayStr
        }

        let cyclesSinceLongBreak = s.cyclesSinceLongBreak
        let newMode: PomodoroMode
        if (wasWork) {
          if (countCycle) {
            completedCycles += 1
            cyclesSinceLongBreak += 1
          }
          if (cyclesSinceLongBreak >= s.longBreakInterval) {
            newMode = "longBreak"
            cyclesSinceLongBreak = 0
          } else {
            newMode = "shortBreak"
          }
        } else {
          newMode = "work"
        }

        const autoStart = wasWork ? s.autoStartBreaks : s.autoStartWork
        const newDuration = modeMs(s, newMode)
        const endTimestamp = autoStart ? Date.now() + newDuration : null

        set({
          mode: newMode,
          isRunning: autoStart,
          endTimestamp,
          remainingMs: newDuration,
          completedCycles,
          cyclesSinceLongBreak,
          lastActiveDate,
        })

        if (!silent) {
          if (s.soundEnabled) playChime(wasWork ? "success" : "resume")
          notify(
            wasWork ? "Çalışma bitti — mola zamanı" : "Mola bitti — çalışmaya dön",
            wasWork
              ? newMode === "longBreak"
                ? `${s.longBreakMinutes} dakika uzun mola.`
                : `${s.shortBreakMinutes} dakika kısa mola.`
              : `${s.workMinutes} dakikalık yeni odak seansı.`,
          )
        }
      },

      updateSettings: (patch) => {
        const s = get()
        const next: Settings = {
          workMinutes: clampMinutes(patch.workMinutes ?? s.workMinutes, 1, 90),
          shortBreakMinutes: clampMinutes(patch.shortBreakMinutes ?? s.shortBreakMinutes, 1, 30),
          longBreakMinutes: clampMinutes(patch.longBreakMinutes ?? s.longBreakMinutes, 1, 60),
          autoStartBreaks: patch.autoStartBreaks ?? s.autoStartBreaks,
          autoStartWork: patch.autoStartWork ?? s.autoStartWork,
          soundEnabled: patch.soundEnabled ?? s.soundEnabled,
          longBreakInterval: s.longBreakInterval,
        }

        // mevcut mod için süre değiştiyse, idle ise remainingMs'i güncelle
        const newDuration = modeMs(next, s.mode)
        const shouldRefresh = !s.isRunning && s.remainingMs !== newDuration
        set({
          ...next,
          ...(shouldRefresh ? { remainingMs: newDuration } : {}),
        })
      },

      openFocus: () => set({ focusOpen: true }),
      closeFocus: () => set({ focusOpen: false }),
      setFocus: (open) => set({ focusOpen: open }),
    }),
    {
      name: "kocup-pomodoro",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // focusOpen ve action'lar persist edilmez
      partialize: (state) => ({
        workMinutes: state.workMinutes,
        shortBreakMinutes: state.shortBreakMinutes,
        longBreakMinutes: state.longBreakMinutes,
        autoStartBreaks: state.autoStartBreaks,
        autoStartWork: state.autoStartWork,
        soundEnabled: state.soundEnabled,
        longBreakInterval: state.longBreakInterval,
        mode: state.mode,
        isRunning: state.isRunning,
        endTimestamp: state.endTimestamp,
        remainingMs: state.remainingMs,
        completedCycles: state.completedCycles,
        cyclesSinceLongBreak: state.cyclesSinceLongBreak,
        lastActiveDate: state.lastActiveDate,
      }),
    },
  ),
)

export const POMODORO_LIMITS = {
  workMin: 1, workMax: 90,
  shortMin: 1, shortMax: 30,
  longMin: 1, longMax: 60,
}
