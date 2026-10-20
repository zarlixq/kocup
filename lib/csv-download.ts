// İstemci tarafı CSV dışa aktarım (Excel uyumlu: UTF-8 BOM + ; ayraç).

export function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\n")
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
