import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-zinc-400" />
        </div>
      )}
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
      {action && (
        <Button className="mt-4 bg-[#1B6B8A] hover:bg-[#155a75]" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
