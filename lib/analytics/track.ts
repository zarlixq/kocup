"use client"

type Event = {
  path: string
  eventType: "page_view" | "tool_use"
  toolSlug?: string
}

const ENDPOINT = "/api/track"

/**
 * Network gönderimi — sendBeacon (varsa) ya da keepalive fetch.
 * Her ikisi de tamamen non-blocking; navigasyonu beklemez.
 * Browser, sendBeacon yanıtındaki Set-Cookie'yi de işler — ilk ziyaretçide
 * minted session cookie'si yine de kaydedilir.
 */
function fire(payload: string) {
  try {
    const nav: Navigator | null =
      typeof navigator !== "undefined" ? navigator : null
    if (nav && typeof nav.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" })
      if (nav.sendBeacon(ENDPOINT, blob)) return
    }
  } catch {
    // sendBeacon başarısız olursa fetch yedeğine düş
  }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Hiçbir hata kullanıcıyı etkilemez
  }
}

/**
 * requestIdleCallback ile gönderimi browser idle'ına ertele.
 * Böylece tracker ne route geçişini ne kullanıcı etkileşimini etkilemez.
 */
function send(event: Event) {
  if (typeof window === "undefined") return
  const payload = JSON.stringify(event)
  const win = window as typeof window & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout?: number }
    ) => number
  }
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => fire(payload), { timeout: 2000 })
  } else {
    // Eski tarayıcılarda mikro-task'a ertele
    setTimeout(() => fire(payload), 0)
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
