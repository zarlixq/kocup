"use client"

import { useRef } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import { slugify } from "@/lib/slug"

function nodeToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join("")
  if (typeof node === "object" && "props" in node) {
    return nodeToText((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ""
}

export function Markdown({ content }: { content: string }) {
  // H2 slug üretiminin extractH2Headings ile birebir aynı dedupe sırasını
  // koruması için her render'da sıfırlanan bir sayaç tutuyoruz.
  const seenRef = useRef<Map<string, number>>(new Map())
  seenRef.current = new Map()

  const components: Components = {
    h2: ({ children, ...props }) => {
      const text = nodeToText(children).trim()
      const base = slugify(text) || "baslik"
      const count = seenRef.current.get(base) ?? 0
      const id = count === 0 ? base : `${base}-${count + 1}`
      seenRef.current.set(base, count + 1)
      return (
        <h2 id={id} className="scroll-mt-24 md:scroll-mt-28" {...props}>
          {children}
        </h2>
      )
    },
  }

  return (
    <article className="prose prose-slate prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-zinc-700 prose-p:leading-relaxed prose-li:text-zinc-700 prose-strong:text-zinc-900 prose-a:text-[#1B6B8A] prose-a:font-semibold hover:prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline prose-code:text-[#1B6B8A] prose-code:bg-orange-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-[#F97316] prose-blockquote:bg-orange-50/40 prose-blockquote:py-1 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:rounded-r-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
