import { publicUrl, SITE_NAME } from "./site"
import { BRAND_LABEL } from "../brand"
import { SOCIAL_IMAGE } from "./social-image"

export type BreadcrumbItem = { name: string; path: string }

export function serializeStructuredData(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
}

export function breadcrumbData(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: publicUrl(item.path) })),
  }
}

export function websiteData() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": publicUrl("/") + "#website", name: SITE_NAME, alternateName: [BRAND_LABEL, "gitarakordi.com"], url: publicUrl("/"), inLanguage: "sr-Latn", image: { "@type": "ImageObject", url: publicUrl(SOCIAL_IMAGE.src), width: SOCIAL_IMAGE.width, height: SOCIAL_IMAGE.height } }
}
