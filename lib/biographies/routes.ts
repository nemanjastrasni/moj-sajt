export const biographyRoutes = [
  { artistId: "cmmxssxcx000nobh8dh6cg47m", category: "domace", slug: "aleksa-jelic", sr: "/biografija/domace/aleksa-jelic", en: "/en/biography/aleksa-jelic" },
  { artistId: "cmmxssxjq000xobh8vukqpr8e", category: "domace", slug: "aleksandra-kovac", sr: "/biografija/domace/aleksandra-kovac", en: "/en/biography/aleksandra-kovac" },
  { artistId: "cmmxssxr20019obh8cyurvyfj", category: "domace", slug: "aleksandra-prijovic", sr: "/biografija/domace/aleksandra-prijovic", en: "/en/biography/aleksandra-prijovic" },
  { artistId: "cmmxssy1d001sobh8a7ovtzpv", category: "domace", slug: "aleksandra-radovic", sr: "/biografija/domace/aleksandra-radovic", en: "/en/biography/aleksandra-radovic" },
  { artistId: "cmmxssyf8002hobh8vj91jytu", category: "domace", slug: "alen-islamovic", sr: "/biografija/domace/alen-islamovic", en: "/en/biography/alen-islamovic" },
] as const

export function reviewedBiographyRoute(artist: { id: string; category: string | null; slug: string }) {
  return biographyRoutes.find(route => route.artistId === artist.id && route.category === artist.category && route.slug === artist.slug)
}
