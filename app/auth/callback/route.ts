import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // ───────────────────────────────────────────────────────────────
  // DEBUG (terminal log — Server Component, browser console DEĞİL)
  // ───────────────────────────────────────────────────────────────
  console.log("CALLBACK PARAMS:", {
    fullUrl: request.url,
    search: searchParams.toString(),
    code: searchParams.get("code"),
    token_hash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    error: searchParams.get("error"),
    error_code: searchParams.get("error_code"),
    error_description: searchParams.get("error_description"),
    next: searchParams.get("next"),
  })

  // Supabase, link'i error ile geri yönlendirdiyse (otp_expired vs.)
  // bu parametreler dolu gelir. Hata varsa hemen yönlendir.
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  if (errorCode) {
    console.error("CALLBACK SUPABASE ERROR:", { errorCode, errorDescription })
    return NextResponse.redirect(
      `${origin}/giris/ogrenci?error=${encodeURIComponent(errorCode)}`
    )
  }

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const tokenType = searchParams.get("type") // 'invite' | 'recovery' | 'magiclink' | 'signup' | 'email_change'

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ───────────────────────────────────────────────────────────────
  // Path 1: PKCE — link ?code=... ile geldi
  // ───────────────────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("EXCHANGE CODE ERROR:", error)
      return NextResponse.redirect(
        `${origin}/giris/ogrenci?error=${encodeURIComponent(error.code ?? "exchange_failed")}`
      )
    }
    return NextResponse.redirect(`${origin}/sifre-belirle`)
  }

  // ───────────────────────────────────────────────────────────────
  // Path 2: Legacy OTP verify — link ?token_hash=...&type=invite ile geldi
  // (PKCE flow yerine implicit/OTP flow ile gönderilmişse)
  // ───────────────────────────────────────────────────────────────
  if (tokenHash && tokenType) {
    const { error } = await supabase.auth.verifyOtp({
      type: tokenType as "invite" | "recovery" | "magiclink" | "signup" | "email_change",
      token_hash: tokenHash,
    })
    if (error) {
      console.error("VERIFY OTP ERROR:", error)
      return NextResponse.redirect(
        `${origin}/giris/ogrenci?error=${encodeURIComponent(error.code ?? "verify_failed")}`
      )
    }
    return NextResponse.redirect(`${origin}/sifre-belirle`)
  }

  // Hiçbir flow eşleşmedi
  console.warn("CALLBACK: ne code ne token_hash geldi")
  return NextResponse.redirect(`${origin}/giris/ogrenci?error=link_gecersiz`)
}
