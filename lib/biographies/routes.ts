export const biographyRoutes = [
  { artistId: "cmmxssxjq000xobh8vukqpr8e", category: "domace", slug: "aleksandra-kovac", sr: "/biografija/domace/aleksandra-kovac", en: "/en/biography/aleksandra-kovac" },
  { artistId: "cmmxssy1d001sobh8a7ovtzpv", category: "domace", slug: "aleksandra-radovic", sr: "/biografija/domace/aleksandra-radovic", en: "/en/biography/aleksandra-radovic" },
] as const

export function reviewedBiographyRoute(artist: { id: string; category: string | null; slug: string }) {
  return biographyRoutes.find(route => route.artistId === artist.id && route.category === artist.category && route.slug === artist.slug)
}
