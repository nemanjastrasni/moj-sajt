import { BRAND_ACCENT, BRAND_LABEL } from "@/lib/brand"
import { BRAND_LOGO_HEIGHT, BRAND_LOGO_PATHS, BRAND_LOGO_WIDTH } from "@/lib/brand-artwork"

export default function BrandLogo() {
  return <span className="site-brand">
    <svg className="site-brand-image" viewBox={`0 0 ${BRAND_LOGO_WIDTH} ${BRAND_LOGO_HEIGHT}`} width={BRAND_LOGO_WIDTH} height={BRAND_LOGO_HEIGHT} role="img" aria-label={BRAND_LABEL}>
      <path d={BRAND_LOGO_PATHS.lettering} fill="var(--brand-ink, #fafafa)" fillRule="evenodd" />
      <path d={BRAND_LOGO_PATHS.suffix} fill="var(--brand-suffix, #bdbdbd)" fillRule="evenodd" />
      <path d={BRAND_LOGO_PATHS.accent} fill={BRAND_ACCENT} fillRule="evenodd" />
    </svg>
  </span>
}
