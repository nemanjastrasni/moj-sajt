export const biographyRoutes = [
  { artistId: "cmmxssx6z000fobh8dapcykda", category: "domace", slug: "aco-regina", sr: "/biografija/domace/aco-regina", en: "/en/biography/aco-regina" },
  { artistId: "cmmxssxcx000nobh8dh6cg47m", category: "domace", slug: "aleksa-jelic", sr: "/biografija/domace/aleksa-jelic", en: "/en/biography/aleksa-jelic" },
  { artistId: "cmmxssxjq000xobh8vukqpr8e", category: "domace", slug: "aleksandra-kovac", sr: "/biografija/domace/aleksandra-kovac", en: "/en/biography/aleksandra-kovac" },
  { artistId: "cmmxssxr20019obh8cyurvyfj", category: "domace", slug: "aleksandra-prijovic", sr: "/biografija/domace/aleksandra-prijovic", en: "/en/biography/aleksandra-prijovic" },
  { artistId: "cmmxssxoz0016obh81z10qucz", category: "domace", slug: "aleksandra-prijovic-lexington-band", sr: "/biografija/domace/aleksandra-prijovic-lexington-band", en: "/en/biography/aleksandra-prijovic-lexington-band" },
  { artistId: "cmmxssy1d001sobh8a7ovtzpv", category: "domace", slug: "aleksandra-radovic", sr: "/biografija/domace/aleksandra-radovic", en: "/en/biography/aleksandra-radovic" },
  { artistId: "cmmxssyf8002hobh8vj91jytu", category: "domace", slug: "alen-islamovic", sr: "/biografija/domace/alen-islamovic", en: "/en/biography/alen-islamovic" },
  { artistId: "cmmxsszr6004uobh8tjgos3py", category: "domace", slug: "ana-stanic-ft-wikluh-sky", sr: "/biografija/domace/ana-stanic-ft-wikluh-sky", en: "/en/biography/ana-stanic-ft-wikluh-sky" },
] as const

export function reviewedBiographyRoute(artist: { id: string; category: string | null; slug: string }) {
  return biographyRoutes.find(route => route.artistId === artist.id && route.category === artist.category && route.slug === artist.slug)
}
