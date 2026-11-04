import { serializeStructuredData } from "@/lib/seo/structured-data"

export default function StructuredData({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }} />
}
