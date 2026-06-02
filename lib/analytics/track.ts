"use client"

type Event = {
  path: string
  eventType: "page_view" | "tool_use"
  toolSlug?: string
}

function send(event: Event) {
  if (typeof window === "undefined") return
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Hiçbir hata kullanıcıyı etkilemez
  }
}

export function trackPageView(path: string) {
  send({ path, eventType: "page_view" })
}

export function trackToolUse(toolSlug: string, path?: string) {
  const p =
    path ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  send({ path: p, eventType: "tool_use", toolSlug })
}
