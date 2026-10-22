import Link from "next/link"
import { FREE_SIGNUP_PATH } from "@/lib/campaign"

// Kampanya modunda mobilde ekranın altında sabit "Ücretsiz başla" (md+ gizli).
export function MobileStickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <Link
        href={FREE_SIGNUP_PATH}
        className="flex h-12 w-full items-center justify-center rounded-full bg-[#EA580C] text-xl font-bold text-white shadow-md shadow-orange-500/25 hover:bg-[#c2410c]"
      >
        Ücretsiz başla
      </Link>
    </div>
  )
}
