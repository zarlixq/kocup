// Türkçe okuma hızı: ~200 kelime/dakika (yetişkin ortalama)
const WPM = 200

export function readingTime(text: string): number {
  if (!text) return 1
  const words = text.split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / WPM)
  return Math.max(1, minutes)
}
