import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────
// Toplu öğrenci import — CSV parse + doğrulama (sıfır bağımlılık)
// Türkçe Excel export'ları: ayraç genelde ; ve UTF-8 BOM olabilir.
// ─────────────────────────────────────────────────────────────────────────

export const GRADES = ["5", "6", "7", "8", "9", "10", "11", "12", "Mezun"] as const

export type ImportRowData = {
  full_name: string
  email: string
  grade: string | null
  segment: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  school: string | null
}

export type ParsedRow =
  | { ok: true; index: number; data: ImportRowData }
  | { ok: false; index: number; raw: Record<string, string>; error: string }

const COLUMN_ALIASES: Record<string, keyof ImportRowData> = {
  ad_soyad: "full_name",
  adsoyad: "full_name",
  isim: "full_name",
  ad: "full_name",
  email: "email",
  eposta: "email",
  "e_posta": "email",
  mail: "email",
  sinif: "grade",
  grade: "grade",
  segment: "segment",
  telefon: "phone",
  phone: "phone",
  gsm: "phone",
  veli_adi: "parent_name",
  veli: "parent_name",
  veli_ad: "parent_name",
  veli_telefon: "parent_phone",
  veli_tel: "parent_phone",
  okul: "school",
  school: "school",
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[\s-]+/g, "_")
}

/** Ayraç tespiti: virgül mü noktalı virgül mü (ilk satıra göre). */
function detectDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length
  const semis = (firstLine.match(/;/g) ?? []).length
  return semis > commas ? ";" : ","
}

/** Basit CSV parser — tırnak içi ayraç/yeni satır destekler. */
export function parseCsvText(text: string): string[][] {
  // UTF-8 BOM strip
  const clean = text.replace(/^﻿/, "")
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ""
  const delim = detectDelimiter(firstLine)

  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c === "\r") {
      // ignore (CRLF)
    } else {
      field += c
    }
  }
  // son alan/satır
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

const rowSchema = z
  .object({
    full_name: z.string().trim().min(2, "Ad soyad en az 2 karakter."),
    email: z.string().trim().email("Geçersiz email."),
    grade: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null))
      .refine((v) => v === null || GRADES.includes(v as (typeof GRADES)[number]), {
        message: "Sınıf 5-12 veya Mezun olmalı.",
      }),
    segment: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null))
      .refine((v) => v === null || v === "lgs" || v === "yks", {
        message: "Segment lgs veya yks olmalı.",
      }),
    phone: z.string().trim().optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
    parent_name: z.string().trim().optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
    parent_phone: z.string().trim().optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
    school: z.string().trim().optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine(
    (d) => {
      if (!d.segment || !d.grade) return true
      const isLgsGrade = ["5", "6", "7", "8"].includes(d.grade)
      return d.segment === "lgs" ? isLgsGrade : !isLgsGrade
    },
    { message: "Segment ile sınıf uyumsuz (LGS=5-8, YKS=9-12/Mezun).", path: ["segment"] },
  )

/** Ham CSV metnini başlık eşleyip doğrulayarak satırlara çevirir. */
export function parseImportCsv(text: string): {
  rows: ParsedRow[]
  headerError?: string
} {
  const grid = parseCsvText(text)
  if (grid.length < 2) {
    return { rows: [], headerError: "Dosyada başlık satırı ve en az bir kayıt olmalı." }
  }

  const headers = grid[0].map((h) => COLUMN_ALIASES[normalizeHeader(h)] ?? null)
  if (!headers.includes("full_name") || !headers.includes("email")) {
    return {
      rows: [],
      headerError: "Zorunlu sütunlar eksik: en az 'ad_soyad' ve 'email' olmalı.",
    }
  }

  const out: ParsedRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i]
    const raw: Record<string, string> = {}
    headers.forEach((key, idx) => {
      if (key) raw[key] = (cells[idx] ?? "").trim()
    })

    const parsed = rowSchema.safeParse(raw)
    if (parsed.success) {
      out.push({ ok: true, index: i, data: parsed.data as ImportRowData })
    } else {
      out.push({
        ok: false,
        index: i,
        raw,
        error: parsed.error.issues[0]?.message ?? "Geçersiz satır.",
      })
    }
  }
  return { rows: out }
}

export const IMPORT_TEMPLATE_FILENAME = "ogrenci-import-sablon.csv"

export const IMPORT_TEMPLATE_CSV =
  "ad_soyad,email,sinif,segment,telefon,veli_adi,veli_telefon,okul\n" +
  "Ahmet Yılmaz,ahmet@ornek.com,8,lgs,5551112233,Ayşe Yılmaz,5559998877,Atatürk Ortaokulu\n" +
  "Zeynep Demir,zeynep@ornek.com,12,yks,5554445566,Mehmet Demir,5553332211,Cumhuriyet Lisesi\n"
