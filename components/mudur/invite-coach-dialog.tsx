"use client"

import { useTransition } from "react"
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
import { Button } from "@/components/ui/button"
import { inviteCoach } from "@/app/mudur/koclar/actions"

const schema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad en az 3 karakter."),
  email: z.string().trim().email("Geçerli bir email girin."),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[0-9+ ()-]{7,20}$/.test(v), "Geçerli bir telefon girin."),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteCoachDialog({ open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", phone: "" },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await inviteCoach(values)
      if (result.success) {
        toast.success("Davet e-postası gönderildi.")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Koç Ekle</DialogTitle>
          <DialogDescription>
            Koça davet e-postası gönderilecek, şifresini kendisi belirleyecek.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmet Yılmaz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="koc@ornek.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Vazgeç
              </Button>
              <Button type="submit" className="bg-[#1B6B8A] hover:bg-[#155a75]" disabled={isPending}>
                {isPending ? "Gönderiliyor..." : "Davet Gönder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
