"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeForcedPasswordChange } from "./actions"

export function SifreDegistirForm({ destination }: { destination: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem("password") as HTMLInputElement).value
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value

    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.")
      return
    }
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalı.")
      return
    }

    setPending(true)
    const res = await completeForcedPasswordChange(password)
    setPending(false)

    if (!res.success) {
      toast.error(res.error ?? "Şifre değiştirilemedi.")
      return
    }

    toast.success("Şifren güncellendi, yönlendiriliyorsun...")
    router.push(destination)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Yeni Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="En az 8 karakter"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Şifre Tekrar</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Şifreyi tekrar girin"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" className="w-full bg-[#1B6B8A] hover:bg-[#155a75]" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Şifremi Değiştir ve Devam Et"}
      </Button>
    </form>
  )
}
