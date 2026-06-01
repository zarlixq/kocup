"use client"

import { cn } from "@/lib/utils"
import type { PomodoroMode } from "@/lib/pomodoro/store"

type TimerRingProps = {
  /** 0 ile 1 arası ilerleme (geçen süre / toplam süre) */
  progress: number
  mode: PomodoroMode
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

const MODE_COLORS: Record<PomodoroMode, { stroke: string; track: string }> = {
  work: { stroke: "#F97316", track: "#1B6B8A" },
  shortBreak: { stroke: "#14B8A6", track: "#1B6B8A" },
  longBreak: { stroke: "#0EA5A4", track: "#1B6B8A" },
}

export function TimerRing({
  progress,
  mode,
  size = 200,
  strokeWidth = 10,
  className,
  children,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))
  const offset = circumference * (1 - clamped)
  const { stroke, track } = MODE_COLORS[mode]

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeOpacity={0.12}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
