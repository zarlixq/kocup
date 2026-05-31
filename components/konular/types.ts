export type Status = "basla" | "devam" | "tamam" | "tekrar"

export type TopicCard = {
  id: string
  status: Status
  topicName: string
  subjectName: string
  isCustom: boolean
  solvedCount: number
  wrongCount: number
  errorNotes: string | null
}

export function successRate(solved: number, wrong: number): number {
  if (solved <= 0) return 0
  return Math.round(((solved - wrong) / solved) * 100)
}

export function progressTone(rate: number): {
  text: string
  bg: string
  dot: string
} {
  if (rate >= 80) return { text: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" }
  if (rate >= 60) return { text: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" }
  if (rate >= 40) return { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" }
  return { text: "text-[#F97316]", bg: "bg-orange-50", dot: "bg-[#F97316]" }
}

export const STATUS_LIST: { value: Status; label: string; tone: string; dot: string; ring: string }[] = [
  {
    value: "basla",
    label: "Başlanacak",
    tone: "bg-zinc-50 text-zinc-700",
    dot: "bg-zinc-400",
    ring: "ring-zinc-200",
  },
  {
    value: "devam",
    label: "Devam Ediyor",
    tone: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    ring: "ring-blue-200",
  },
  {
    value: "tamam",
    label: "Tamamlandı",
    tone: "bg-green-50 text-green-700",
    dot: "bg-green-500",
    ring: "ring-green-200",
  },
  {
    value: "tekrar",
    label: "Tekrar",
    tone: "bg-orange-50 text-[#F97316]",
    dot: "bg-[#F97316]",
    ring: "ring-[#F97316]/30",
  },
]

export const STATUS_LABEL: Record<Status, string> = Object.fromEntries(
  STATUS_LIST.map((s) => [s.value, s.label]),
) as Record<Status, string>
