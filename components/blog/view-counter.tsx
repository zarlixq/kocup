"use client"

import { useEffect } from "react"
import { incrementBlogView } from "@/app/(public)/blog/actions"

export function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return
    const key = `blog_view_${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // sessionStorage erişilemiyorsa devam et — increment yine de bir kez denenir
    }
    void incrementBlogView(slug).catch(() => {})
  }, [slug])

  return null
}
