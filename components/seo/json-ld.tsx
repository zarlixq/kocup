type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: JsonValue }
  | JsonValue[]

type JsonLdProps = {
  data: JsonValue | JsonValue[]
  id?: string
}

export function JsonLd({ data, id }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          id={id ? `${id}-${i}` : undefined}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item, (_k, v) => (v === undefined ? undefined : v)),
          }}
        />
      ))}
    </>
  )
}
