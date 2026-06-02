"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  FileText,
  UserCog,
  GraduationCap,
  BookOpen,
  BookText,
  Wallet,
  Calendar,
  Target,
  ClipboardCheck,
  Menu,
  LogOut,
  User,
  Settings,
  BarChart3,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/brand/logo"
import { signOut } from "@/app/mudur/actions"

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badgeKey?: "pending"
}

const NAV: NavItem[] = [
  { href: "/mudur", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mudur/basvurular", label: "Başvurular", icon: FileText, badgeKey: "pending" },
  { href: "/mudur/koclar", label: "Koçlar", icon: UserCog },
  { href: "/mudur/ogrenciler", label: "Öğrenciler", icon: GraduationCap },
  { href: "/mudur/konu-analizi", label: "Konu Analizi", icon: Target },
  { href: "/mudur/denemeler", label: "Denemeler", icon: ClipboardCheck },
  { href: "/mudur/randevular", label: "Randevular", icon: Calendar },
  { href: "/mudur/finans", label: "Finans", icon: Wallet },
  { href: "/mudur/mufredat", label: "Müfredat", icon: BookOpen },
  { href: "/mudur/blog", label: "Blog", icon: BookText },
  { href: "/mudur/ziyaretler", label: "Ziyaretler", icon: BarChart3 },
]

const ACCOUNT_NAV: NavItem[] = [
  { href: "/mudur/profilim", label: "Profilim", icon: User },
  { href: "/mudur/ayarlar", label: "Ayarlar", icon: Settings },
]

type SidebarProps = {
  user: { full_name: string; email: string }
  pendingCount: number
}

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function NavList({ pathname, pendingCount, onClick }: {
  pathname: string
  pendingCount: number
  onClick?: () => void
}) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map((item) => {
        const Icon = item.icon
        const isActive = item.href === "/mudur"
          ? pathname === "/mudur"
          : pathname.startsWith(item.href)
        const badgeNum = item.badgeKey === "pending" ? pendingCount : 0

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
              isActive
                ? "bg-orange-50 text-[#1B6B8A] border-l-4 border-[#F97316] pl-2"
                : "text-zinc-600 hover:bg-zinc-50"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badgeNum > 0 && (
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                {badgeNum}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBody({ user, pendingCount, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-100">
        <BrandLogo width={36} height={36} className="rounded" />
        <div className="flex flex-col">
          <span className="font-bold text-[#1B6B8A] leading-tight">KoçUp</span>
          <span className="text-xs text-zinc-500 leading-tight">Müdür Paneli</span>
        </div>
      </div>

      <NavList pathname={pathname} pendingCount={pendingCount} onClick={onNavigate} />

      <Separator />
      <nav className="px-3 py-3 space-y-1">
        {ACCOUNT_NAV.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-50 text-[#1B6B8A] border-l-4 border-[#F97316] pl-2"
                  : "text-zinc-600 hover:bg-zinc-50",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
              {initials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-zinc-900 truncate">{user.full_name}</span>
            <span className="text-xs text-zinc-500 truncate">{user.email}</span>
          </div>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-zinc-600 hover:text-zinc-900"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </form>
      </div>
    </div>
  )
}

export function Sidebar({ user, pendingCount }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 z-30">
        <SidebarBody user={user} pendingCount={pendingCount} />
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <BrandLogo width={28} height={28} className="rounded" />
          <span className="font-semibold text-[#1B6B8A]">KoçUp</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menüyü aç">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarBody
              user={user}
              pendingCount={pendingCount}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
