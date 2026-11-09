// Vercel can expose its internal /index alias while regenerating the root ISR
// page. The browser still visits /, so both renders must use the public path.
export function publicPathname(pathname: string): string {
  return pathname === "/index" ? "/" : pathname
}
