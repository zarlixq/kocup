/** Açık yönlendirmeyi önle: yalnız site içi mutlak yol. */
export function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  return raw
}
