/**
 * UpPlan kuyruğu (sirada / zaman_kalirsa) hedef listelerinde gösterilmez;
 * koç/müdür öğrenci detayında yalnız sayı olarak belirtilir.
 */
export function QueuedSummaryNote({ queued }: { queued: { sirada: number; zaman_kalirsa: number } }) {
  const parts = [
    queued.sirada > 0 ? `${queued.sirada} konu sırada` : null,
    queued.zaman_kalirsa > 0 ? `${queued.zaman_kalirsa} konu "zaman kalırsa" listesinde` : null,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return (
    <p className="mb-3 text-xs text-zinc-500">
      Öğrencinin UpPlan yol haritasında henüz açılmamış {parts.join(", ")} bekliyor; bunlar açıldıkça burada aktif hedef
      olarak görünür.
    </p>
  )
}
