"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createLead, updateLead } from "@/app/mudur/satis-takibi/actions"
import {
  DURUM_OPTIONS,
  DURUM_VALUES,
  KURUM_TIPI_OPTIONS,
  KURUM_TIPI_VALUES,
  type SalesLead,
} from "@/lib/satis-takibi"

const schema = z.object({
  kurum_adi: z.string().trim().min(2, "Kurum adı en az 2 karakter."),
  kurum_tipi: z.enum(KURUM_TIPI_VALUES),
  durum: z.enum(DURUM_VALUES),
  il: z.string().trim().optional(),
  ilce: z.string().trim().optional(),
  iletisim_kisisi: z.string().trim().optional(),
  telefon: z.string().trim().optional(),
  ogrenci_sayisi: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Sadece sayı girin."),
  verilen_fiyat: z.string().trim().optional(),
  son_temas_tarihi: z.string().trim().optional(),
  sonraki_adim: z.string().trim().optional(),
  sonraki_adim_tarihi: z.string().trim().optional(),
  notlar: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

function toDefaults(lead?: SalesLead | null): FormValues {
  return {
    kurum_adi: lead?.kurum_adi ?? "",
    kurum_tipi: (lead?.kurum_tipi as FormValues["kurum_tipi"]) ?? "dershane",
    durum: (lead?.durum as FormValues["durum"]) ?? "iletisim_kurulmadi",
    il: lead?.il ?? "",
    ilce: lead?.ilce ?? "",
    iletisim_kisisi: lead?.iletisim_kisisi ?? "",
    telefon: lead?.telefon ?? "",
    ogrenci_sayisi: lead?.ogrenci_sayisi != null ? String(lead.ogrenci_sayisi) : "",
    verilen_fiyat: lead?.verilen_fiyat ?? "",
    son_temas_tarihi: lead?.son_temas_tarihi ?? "",
    sonraki_adim: lead?.sonraki_adim ?? "",
    sonraki_adim_tarihi: lead?.sonraki_adim_tarihi ?? "",
    notlar: lead?.notlar ?? "",
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: SalesLead | null
}

export function LeadFormDialog({ open, onOpenChange, lead }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!lead
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(lead),
  })

  // Düzenlenen kayıt değiştiğinde formu yeniden doldur.
  useEffect(() => {
    if (open) form.reset(toDefaults(lead))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateLead(lead!.id, values)
        : await createLead(values)
      if (result.success) {
        toast.success(isEdit ? "Kurum güncellendi." : "Kurum eklendi.")
        form.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kurumu Düzenle" : "Yeni Kurum Ekle"}</DialogTitle>
          <DialogDescription>
            İletişime geçilen kurumun satış takip bilgilerini girin.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="kurum_adi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kurum Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. Başarı Dershanesi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kurum_tipi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kurum Tipi</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KURUM_TIPI_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURUM_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="il"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İl <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Örn. İstanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ilce"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İlçe <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Örn. Kadıköy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="iletisim_kisisi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İletişim Kişisi <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Örn. Ahmet Yılmaz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="05XX XXX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ogrenci_sayisi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öğrenci Sayısı <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="Örn. 250" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="verilen_fiyat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verilen Fiyat <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input placeholder='Örn. "7500/ay" veya "%40 indirimli 4500"' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="son_temas_tarihi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Son Temas Tarihi <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sonraki_adim_tarihi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sonraki Adım Tarihi <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sonraki_adim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sonraki Adım <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. Demo sunumu yapılacak" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notlar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar <span className="text-zinc-400 font-normal">(opsiyonel)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Görüşme detayları, notlar..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                className="bg-[#1B6B8A] hover:bg-[#155a75]"
                disabled={isPending}
              >
                {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
