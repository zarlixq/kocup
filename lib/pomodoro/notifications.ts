// Masaüstü bildirimi — sadece kullanıcı timer'ı ilk başlattığında izin iste.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window
}

export function currentPermission(): NotificationPermission | null {
  if (!notificationsSupported()) return null
  return Notification.permission
}

/**
 * İzin durumu "default" ise kullanıcıya soracak.
 * Zaten "granted" veya "denied" ise dokunmaz.
 */
export async function ensurePermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied"
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission()
    } catch {
      return "denied"
    }
  }
  return Notification.permission
}

export function notify(title: string, body: string) {
  if (!notificationsSupported()) return
  if (Notification.permission !== "granted") return
  try {
    new Notification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      tag: "kocup-pomodoro",
      silent: false,
    })
  } catch {
    // bazı tarayıcılarda sessizce başarısız olabilir
  }
}
