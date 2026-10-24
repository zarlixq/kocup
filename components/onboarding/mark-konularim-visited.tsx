"use client"

import { useEffect } from "react"
import { markKonularimVisited } from "@/lib/onboarding/actions"

/** Konularım açılınca kurulum listesinin "gözden geçir" adımını işaretler (bir kez). */
export function MarkKonularimVisited({ already }: { already: boolean }) {
  useEffect(() => {
    if (!already) void markKonularimVisited()
  }, [already])
  return null
}
