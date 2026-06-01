// Hafif, hoş bir bitiş tonu — harici dosya gerektirmez.
// İlk çağrıda AudioContext lazy oluşturulur; tarayıcı autoplay politikasına
// uymak için MUTLAKA bir kullanıcı etkileşimi (start/skip/click) tetiklemeli.

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (ctx) return ctx
  type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
  const w = window as WindowWithWebkit
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

/**
 * Kısa, iki-tonlu yumuşak chime. ~600ms.
 * type=success → yükselen ton (work bitti, mola başlıyor)
 * type=resume  → düşen ton (mola bitti, çalışmaya dön)
 */
export function playChime(type: "success" | "resume" = "success") {
  const audio = getContext()
  if (!audio) return
  if (audio.state === "suspended") {
    void audio.resume()
  }

  const now = audio.currentTime
  const freqs = type === "success" ? [523.25, 783.99] : [659.25, 440.0]

  freqs.forEach((freq, i) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = "sine"
    osc.frequency.value = freq

    const start = now + i * 0.18
    const stop = start + 0.42
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, stop)

    osc.connect(gain).connect(audio.destination)
    osc.start(start)
    osc.stop(stop + 0.02)
  })
}

/**
 * AudioContext'i kullanıcı gesture'ında uyandırmak için.
 * Start butonuna ilk basıldığında çağrılmalı (chime gerçekten çalmasa bile).
 */
export function primeAudio() {
  const audio = getContext()
  if (audio && audio.state === "suspended") void audio.resume()
}
