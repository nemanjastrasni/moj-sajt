export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: "/admin",
      },
    ],
    sitemap: "https://gitarakordi.com/sitemap.xml",
  }
}