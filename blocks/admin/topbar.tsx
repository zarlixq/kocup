"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Menu, LayoutDashboard, Users, Wallet, Settings, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOutAction } from "@/app/admin/giris/actions"

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/admin/odemeler", label: "Ödemeler", icon: Wallet },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
]

export function Topbar({ coachName }: { coachName: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
      <Link href="/admin">
        <Image src="/logo.png" alt="KoçUp" width={90} height={32} className="object-contain" priority />
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 rounded-md hover:bg-zinc-100">
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <div className="px-6 py-5 border-b border-zinc-200">
            <Image src="/logo.png" alt="KoçUp" width={100} height={36} className="object-contain" />
            <div className="mt-3 text-xs text-zinc-500 truncate">{coachName}</div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {items.map((it) => {
              const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
              const Icon = it.icon
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-[#1B6B8A] text-white" : "text-zinc-700 hover:bg-zinc-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              )
            })}
          </nav>
          <form action={signOutAction} className="p-3 border-t border-zinc-200">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </header>
  )
}
