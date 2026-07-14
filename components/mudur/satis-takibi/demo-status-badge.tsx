import { cn } from "@/lib/utils"
import { DEMO_STATUS_COLORS, DEMO_STATUS_LABEL, type DemoStatus } from "@/lib/satis-takibi"

export function DemoStatusBadge({
  status,
  className,
}: {
  status: DemoStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        DEMO_STATUS_COLORS[status],
        className,
      )}
    >
      {DEMO_STATUS_LABEL[status]}
    </span>
  )
}
