import Link from "next/link"
import StructuredData from "./StructuredData"
import { breadcrumbData, type BreadcrumbItem } from "@/lib/seo/structured-data"
import styles from "./Breadcrumbs.module.css"

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return <>
    <nav className={styles.nav} aria-label="Putanja stranice">
      <ol>{items.map((item, index) => <li key={item.path}>
        {index > 0 && <span className={styles.separator} aria-hidden="true">›</span>}
        {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path} prefetch={false}>{item.name}</Link>}
      </li>)}</ol>
    </nav>
    <StructuredData data={breadcrumbData(items)} />
  </>
}
