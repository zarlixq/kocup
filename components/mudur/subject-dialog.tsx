"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSubject, updateSubject } from "@/app/mudur/mufredat/actions"

const schema = z.object({
  name: z.string().trim().min(2, "Ders adı en az 2 karakter."),
  exam_type: z.enum(["TYT", "AYT"]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB formatında olmalı."),
  order: z.number().int().min(0, "Sıra 0 veya daha büyük olmalı."),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: {
    id: string
    name: string
    exam_type: string | null
    color: string
    order: number
  } | null
  defaultOrder: number
}

export function SubjectDialog({ open, onOpenChange, initial, defaultOrder }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEdit = !!initial

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      exam_type: "TYT",
      color: "#1B6B8A",
      order: defaultOrder,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        exam_type: (initial?.exam_type as "TYT" | "AYT") ?? "TYT",
        color: initial?.color ?? "#1B6B8A",
        order: initial?.order ?? defaultOrder,
      })
    }
  }, [open, initial, defaultOrder, form])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateSubject(initial!.id, values)
        : await createSubject(values)

      if (result.success) {
        toast.success(isEdit ? "Ders güncellendi." : "Ders eklendi.")
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Bir hata oluştu.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Dersi Düzenle" : "Yeni Ders"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ders Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Matematik" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="exam_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sınav Türü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TYT">TYT</SelectItem>
                        <SelectItem value="AYT">AYT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıra</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) => {
                          const n = e.target.valueAsNumber
                          field.onChange(Number.isNaN(n) ? 0 : n)
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Renk</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="color"
                        className="w-14 h-10 p-1 cursor-pointer"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <Input
                      placeholder="#1B6B8A"
                      value={field.value}
                      onChange={field.onChange}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Vazgeç
              </Button>
              <Button type="submit" className="bg-[#1B6B8A] hover:bg-[#155a75]" disabled={isPending}>
                {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
