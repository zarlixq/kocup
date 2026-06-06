import { getSiteUrl } from "@/lib/site-url"

const siteUrl = getSiteUrl()

export const SITE = {
  name: "KoçUp Akademi",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    "Sertifikalı eğitim koçları ile YKS hazırlığında bireysel takip, konu analizi, deneme yönlendirmesi.",
  phone: "+905333704391",
  email: "kocupkocluk@gmail.com",
  whatsapp: "https://wa.me/905333704391",
  sameAs: [] as string[],
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE.url}#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    description: SITE.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.phone,
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: ["Turkish"],
    },
    sameAs: SITE.sameAs,
  }
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "tr-TR",
    publisher: { "@id": `${SITE.url}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export type CoachForSchema = {
  id: string
  full_name: string
  bio: string | null
  certificate_info: string | null
  specialties: string[] | null
}

export function personSchema(coach: CoachForSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}#coach-${coach.id}`,
    name: coach.full_name,
    jobTitle: "Eğitim Koçu",
    description: coach.bio ?? undefined,
    knowsAbout: coach.specialties ?? undefined,
    hasCredential: coach.certificate_info
      ? {
          "@type": "EducationalOccupationalCredential",
          name: coach.certificate_info,
        }
      : undefined,
    worksFor: { "@id": `${SITE.url}#organization` },
  }
}

export type ArticleSchemaInput = {
  title: string
  description: string
  slug: string
  publishedAt: string
  updatedAt: string
  coverImage: string | null
  authorName: string
  categoryName: string | null
}

export function articleSchema(a: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE.url}/blog/${a.slug}#article`,
    headline: a.title,
    description: a.description,
    image: a.coverImage ?? SITE.logo,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    inLanguage: "tr-TR",
    author: {
      "@type": "Person",
      name: a.authorName,
    },
    publisher: { "@id": `${SITE.url}#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE.url}/blog/${a.slug}`,
    },
    articleSection: a.categoryName ?? undefined,
  }
}

export type BreadcrumbItem = { name: string; url: string }

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export type FaqItem = { question: string; answer: string }

export function faqPageSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  }
}

export type ExpertCoachInput = {
  name: string
  title: string
  image?: string
}

export function expertCoachPersonSchema(c: ExpertCoachInput) {
  const id = c.name.toLowerCase().replace(/\s+/g, "-")
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}#person-${id}`,
    name: c.name,
    jobTitle: c.title,
    image: c.image,
    worksFor: { "@id": `${SITE.url}#organization` },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Mesleki Yeterlilik Belgesi",
      name: "MYK Onaylı Eğitim Koçluğu Sertifikası",
    },
  }
}
