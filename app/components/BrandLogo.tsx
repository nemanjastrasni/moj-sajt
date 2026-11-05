import { BRAND_A_PATH, SITE_NAME } from "@/lib/brand"

export default function BrandLogo() {
  const [guitar, chords] = SITE_NAME.split("A")
  return <span className="site-brand">{guitar}<span className="site-brand-joint"><span className="sr-only">A</span><svg className="site-brand-accent" viewBox="0 0 64 72" aria-hidden="true" focusable="false"><path d={BRAND_A_PATH} fill="currentColor" fillRule="evenodd" /></svg></span>{chords}</span>
}
