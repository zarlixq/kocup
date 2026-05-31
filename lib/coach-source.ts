export type CoachSource = "internal" | "external"

export const COACH_SOURCE_LABEL: Record<CoachSource, string> = {
  internal: "KoçUp",
  external: "Bağımsız",
}

export const COACH_SOURCE_DESCRIPTION: Record<CoachSource, string> = {
  internal: "KoçUp ekibinden, MYK belgeli koç.",
  external: "Bağımsız (freelance) koç; kendi öğrencileriyle altyapımızı kullanır.",
}

export function isCoachSource(v: string | null | undefined): v is CoachSource {
  return v === "internal" || v === "external"
}
