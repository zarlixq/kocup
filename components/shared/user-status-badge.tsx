import { Clock, CheckCircle2, MinusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  USER_STATUS_LABEL,
  USER_STATUS_TOOLTIP,
  type UserStatus,
} from "@/lib/user-status"

type Props = {
  status: UserStatus
  size?: "default" | "sm"
  className?: string
}

const VARIANT: Record<UserStatus, "pending" | "paid" | "inactive"> = {
  pending: "partial" as never, // unused; we override className
  active: "paid",
  inactive: "inactive",
}

export function UserStatusBadge({ status, size = "default", className }: Props) {
  // "pending" için özel turuncu (accent) ton — partial sarı/koyu da olur,
  // ama biz davet bekleyen için brand accent (#F97316) seçtik.
  if (status === "pending") {
    const sizeCls = size === "sm" ? "text-[10px] py-0 px-1.5" : "text-xs"
    return (
      <Badge
        variant="outline"
        title={USER_STATUS_TOOLTIP[status]}
        className={`inline-flex items-center gap-1 bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30 ${sizeCls} ${className ?? ""}`}
      >
        <Clock className="h-3 w-3" /> {USER_STATUS_LABEL[status]}
      </Badge>
    )
  }

  if (status === "inactive") {
    return (
      <Badge
        variant={VARIANT[status]}
        title={USER_STATUS_TOOLTIP[status]}
        className={`inline-flex items-center gap-1 ${className ?? ""}`}
      >
        <MinusCircle className="h-3 w-3" /> {USER_STATUS_LABEL[status]}
      </Badge>
    )
  }

  return (
    <Badge
      variant={VARIANT[status]}
      title={USER_STATUS_TOOLTIP[status]}
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
    >
      <CheckCircle2 className="h-3 w-3" /> {USER_STATUS_LABEL[status]}
    </Badge>
  )
}
