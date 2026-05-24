import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Supabase, link'i error ile geri yönlendirdiyse (otp_expired vs.) bu
  // parametreler dolu gelir.
  const errorCode = searchParams.get("error_code")
  if (errorCode) {
    return NextResponse.redirect(
      `${origin}/giris/koc?error=${encodeURIComponent(errorCode)}`
    )
  }

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const tokenType = searchParams.get("type")

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

  // Path 1: PKCE — link ?code=... ile geldi
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/giris/koc?error=${encodeURIComponent(error.code ?? "exchange_failed")}`
      )
    }
    return NextResponse.redirect(`${origin}/sifre-belirle`)
  }

  // Path 2: Token hash — link ?token_hash=...&type=invite ile geldi
  // (Email template'i {{ .TokenHash }} kullanıyorsa)
  if (tokenHash && tokenType) {
    const { error } = await supabase.auth.verifyOtp({
      type: tokenType as "invite" | "recovery" | "magiclink" | "signup" | "email_change",
      token_hash: tokenHash,
    })
    if (error) {
      return NextResponse.redirect(
        `${origin}/giris/koc?error=${encodeURIComponent(error.code ?? "verify_failed")}`
      )
    }
    return NextResponse.redirect(`${origin}/sifre-belirle`)
  }

  // Path 3: Implicit flow — token hash fragment'ta (#access_token=...) geldi.
  // Server fragment'ı göremez, client'a yönlendir. 307 redirect tarayıcıda
  // hash fragment'ı korur.
  return NextResponse.redirect(`${origin}/auth/callback/client`)
}
