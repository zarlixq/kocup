"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

// Bir bölümün render hatası yalnız o bölümü düşürür, sayfa çalışmaya devam eder.
export class SectionBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.title} bölümü`, error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {this.props.title} gösterilemedi. Sayfayı yenileyip tekrar deneyin.
      </section>
    )
  }
}
