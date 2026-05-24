import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Legacy /admin path — tamamen kaldırıldı, koç paneline yönlendir
  if (path.startsWith("/admin")) {
    return redirect(request, "/giris/koc")
  }

  // Portal panel paths
  const isOgrenciPath = path.startsWith("/ogrenci")
  const isKocPath = path.startsWith("/koc")
  const isMudurPath = path.startsWith("/mudur")
  const isPortalPath = isOgrenciPath || isKocPath || isMudurPath

  // ── Unauthenticated ────────────────────────────────────────────────────
  if (!user) {
    if (isOgrenciPath) return redirect(request, "/giris/ogrenci")
    if (isKocPath) return redirect(request, "/giris/koc")
    if (isMudurPath) return redirect(request, "/giris/mudur")
    return supabaseResponse
  }

  // ── Authenticated ──────────────────────────────────────────────────────

  // Role-based protection for portal paths
  if (isPortalPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = profile?.role

    // Profile yoksa giriş sayfasına gönder
    if (!role) {
      return redirect(request, "/giris/koc")
    }

    const roleToPath: Record<string, string> = {
      student: "/ogrenci",
      coach: "/koc",
      admin: "/mudur",
    }

    const expectedPrefix = roleToPath[role]

    if (expectedPrefix && !path.startsWith(expectedPrefix)) {
      return redirect(request, expectedPrefix)
    }
  }

  // Redirect portal login pages if already authenticated with a portal role
  if (path.startsWith("/giris/") && path !== "/giris") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role) {
      const dest =
        profile.role === "student" ? "/ogrenci" :
        profile.role === "coach" ? "/koc" :
        "/mudur"
      return redirect(request, dest)
    }
  }

  return supabaseResponse
}

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}
