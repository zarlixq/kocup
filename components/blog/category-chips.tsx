import Link from "next/link"

type Category = { name: string; slug: string }

type Props = {
  categories: Category[]
  activeSlug?: string
}

export function CategoryChips({ categories, activeSlug }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 md:-mx-0 md:px-0 scrollbar-hide">
      <Link
        href="/blog"
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
          !activeSlug
            ? "bg-[#1B6B8A] text-white"
            : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#1B6B8A]/40 hover:text-[#1B6B8A]"
        }`}
      >
        Tümü
      </Link>
      {categories.map((cat) => {
        const active = cat.slug === activeSlug
        return (
          <Link
            key={cat.slug}
            href={`/blog/kategori/${cat.slug}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              active
                ? "bg-[#1B6B8A] text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-[#1B6B8A]/40 hover:text-[#1B6B8A]"
            }`}
          >
            {cat.name}
          </Link>
        )
      })}
    </div>
  )
}
