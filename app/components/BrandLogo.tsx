import { BRAND_A_PATH, BRAND_PICK_PATH, SITE_NAME } from "@/lib/brand"

export default function BrandLogo() {
  const [guitar, chords] = SITE_NAME.split("A")
  return <span className="site-brand"><svg className="site-brand-symbol site-brand-accent" viewBox="0 0 84 104" fill="none" aria-hidden="true" focusable="false"><path d={BRAND_PICK_PATH} stroke="currentColor" strokeWidth="4" /><path transform="translate(24 29) scale(.56)" d={BRAND_A_PATH} fill="currentColor" fillRule="evenodd" /></svg><span className="site-brand-wordmark">{guitar}<span className="site-brand-joint"><span className="sr-only">A</span><svg className="site-brand-accent" viewBox="0 0 64 72" aria-hidden="true" focusable="false"><path d={BRAND_A_PATH} fill="currentColor" fillRule="evenodd" /></svg></span>{chords}</span></span>
}
