import { NextResponse, type NextRequest } from "next/server"
import { cookies, headers } from "next/headers"
import { randomUUID } from "node:crypto"
import { createClient } from "@/lib/supabase/server"

const SESSION_COOKIE = "kup_sid"
const ONE_YEAR = 60 * 60 * 24 * 365

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export async function POST(req: NextRequest) {
  let body: { path?: unknown; eventType?: unknown; toolSlug?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const path = clean(body.path, 500)
  if (!path) return NextResponse.json({ ok: false }, { status: 400 })

  const eventType = body.eventType === "tool_use" ? "tool_use" : "page_view"
  const toolSlug = clean(body.toolSlug, 64)

  const cookieStore = await cookies()
  const hdrs = await headers()
  const referrer = clean(hdrs.get("referer"), 500)

  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null
  let mintedNew = false
  if (!sessionId) {
    sessionId = randomUUID()
    mintedNew = true
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from("page_views").insert({
    event_type: eventType,
    path,
    tool_slug: toolSlug,
    referrer,
    session_id: sessionId,
    is_authenticated: Boolean(user),
  })

  const res = NextResponse.json({ ok: true })
  if (mintedNew) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
      path: "/",
    })
  }
  return res
}
