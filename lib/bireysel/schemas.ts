import { z } from "zod"
import { ALANLAR } from "@/lib/upplan/profile"

// Bireysel öğrenci formları — client-safe Zod şemaları (ücretsiz kayıt + davet kabulü).

export const YKS_GRADES = ["9", "10", "11", "12"] as const
export const INVITE_GRADES = ["5", "6", "7", "8", "9", "10", "11", "12", "Mezun"] as const

const optionalUtm = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

const checked = (message: string) => z.literal("on", { message })

export const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(72, "Şifre en fazla 72 karakter olabilir.")

/** Ortak yasal onaylar (kayıt + davet kabulü). 18 yaş altında veli beyanı zorunlu. */
export const consentFields = {
  is_minor: z.enum(["evet", "hayir"], { message: "Yaş durumunu seç." }),
  accept_terms: checked("Kullanım Şartları ve Gizlilik Politikası'nı kabul etmelisin."),
  accept_kvkk: checked("KVKK Aydınlatma Metni'ni okuduğunu onaylamalısın."),
  accept_parent: z.literal("on").optional().nullable(),
}

function parentRefine<T extends { is_minor: "evet" | "hayir"; accept_parent?: "on" | null }>(d: T) {
  return d.is_minor === "hayir" || d.accept_parent === "on"
}
const PARENT_MESSAGE = { message: "18 yaşından küçüksen velinin bilgisi dahilinde kullandığını onaylamalısın.", path: ["accept_parent"] }

export const signupSchema = z
  .object({
    full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı.").max(120),
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir."),
    password: passwordSchema,
    status: z.enum(["lise", "mezun"], { message: "Durumunu seç." }),
    grade: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    alan: z.enum(ALANLAR, { message: "Alanını seç." }),
    utm_source: optionalUtm,
    utm_medium: optionalUtm,
    utm_campaign: optionalUtm,
    ...consentFields,
  })
  .refine((d) => d.status === "mezun" || (d.grade !== null && (YKS_GRADES as readonly string[]).includes(d.grade)), {
    message: "Sınıfını seç.",
    path: ["grade"],
  })
  .refine(parentRefine, PARENT_MESSAGE)

export type SignupInput = z.output<typeof signupSchema>

export const acceptInviteSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    password_confirm: z.string(),
    ...consentFields,
  })
  .refine((d) => d.password === d.password_confirm, { message: "Şifreler eşleşmiyor.", path: ["password_confirm"] })
  .refine(parentRefine, PARENT_MESSAGE)

export type AcceptInviteInput = z.output<typeof acceptInviteSchema>

export const invitationSchema = z
  .object({
    full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı.").max(120),
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir."),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    segment: z.enum(["yks", "lgs"]),
    grade: z.enum(INVITE_GRADES, { message: "Sınıf/durum seç." }),
    organization_id: z.string().uuid().nullable().optional().transform((v) => v ?? null),
    coach_id: z.string().uuid().nullable().optional().transform((v) => v ?? null),
  })
  .refine((d) => (d.segment === "lgs" ? ["5", "6", "7", "8"].includes(d.grade) : !["5", "6", "7", "8"].includes(d.grade)), {
    message: "Segment ile sınıf uyumsuz (LGS=5-8, YKS=9-12/Mezun).",
    path: ["grade"],
  })

export type InvitationInput = z.output<typeof invitationSchema>
