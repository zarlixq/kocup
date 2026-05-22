"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-500",
          actionButton: "group-[.toast]:bg-[#1B6B8A] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
