"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

// Kayıt ve davet kabulünde ortak yasal onaylar. Native input → FormData'ya düşer.
// 18 yaş altı seçilirse veli beyanı zorunlu olur (sunucu da Zod ile doğrular).

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" className="text-[#1B6B8A] underline underline-offset-2">
      {children}
    </Link>
  )
}

function CheckRow({ name, required, children }: { name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-zinc-700">
      <input type="checkbox" name={name} required={required} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1B6B8A]" />
      <span>{children}</span>
    </label>
  )
}

export function ConsentFields({ errorField }: { errorField?: string }) {
  const [minor, setMinor] = useState<"evet" | "hayir" | null>(null)

  return (
    <div className="space-y-3">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-zinc-900">Yaşın</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["hayir", "18 yaş ve üzeri"],
              ["evet", "18 yaşından küçüğüm"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm",
                minor === value ? "border-[#1B6B8A] bg-[#1B6B8A]/5 font-medium text-[#1B6B8A]" : "border-zinc-200 text-zinc-700",
                errorField === "is_minor" && "border-red-300",
              )}
            >
              <input
                type="radio"
                name="is_minor"
                value={value}
                required
                className="sr-only"
                onChange={() => setMinor(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <CheckRow name="accept_terms" required>
        <LegalLink href="/kullanim-sartlari">Kullanım Şartları</LegalLink>&apos;nı ve{" "}
        <LegalLink href="/gizlilik">Gizlilik Politikası</LegalLink>&apos;nı okudum, kabul ediyorum.
      </CheckRow>
      <CheckRow name="accept_kvkk" required>
        <LegalLink href="/kvkk-aydinlatma">KVKK Aydınlatma Metni</LegalLink>&apos;ni okudum.
      </CheckRow>
      {minor === "evet" && (
        <CheckRow name="accept_parent" required>
          KoçUp&apos;ı velimin (anne, baba veya vasimin) bilgisi dahilinde kullanıyorum.
        </CheckRow>
      )}
    </div>
  )
}
